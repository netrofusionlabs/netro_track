import { PrismaClient, CapabilityType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import {
  cacheEffectivePermissions,
  getCachedEffectivePermissions,
  invalidateCompanyPermissionCache,
  invalidateUserPermissionCache,
} from '../config/redis';
import { EffectiveAccessProfileDto } from '@netrotrack/shared';

export class PermissionService {
  private static instance: PermissionService;

  private constructor() {}

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Retrieves the set of all Capability IDs entitled to a tenant.
   * This represents the ABSOLUTE ACCESS CEILING for the company.
   */
  public async getTenantEntitledCapabilityIds(companyId: string): Promise<Set<string>> {
    const entitlements = await prisma.companyEntitlement.findMany({
      where: {
        companyId,
        isEnabled: true,
        capability: {
          isActive: true,
        },
      },
      select: {
        capabilityId: true,
      },
    });

    return new Set(entitlements.map((e) => e.capabilityId));
  }

  /**
   * Retrieves the set of all Capability Slugs entitled to a tenant.
   */
  public async getTenantEntitledSlugs(companyId: string): Promise<Set<string>> {
    const entitlements = await prisma.companyEntitlement.findMany({
      where: {
        companyId,
        isEnabled: true,
        capability: {
          isActive: true,
        },
      },
      select: {
        capability: {
          select: {
            slug: true,
          },
        },
      },
    });

    return new Set(entitlements.map((e) => e.capability.slug));
  }

  /**
   * Validates that all requested capability IDs fall strictly within the Tenant Entitlement Ceiling.
   * Throws 403 Forbidden with code 'PERMISSION_NOT_ENTITLED' if any requested capability is not entitled.
   */
  public async validateWithinTenantCeiling(
    companyId: string,
    capabilityIds: string[]
  ): Promise<void> {
    if (!capabilityIds || capabilityIds.length === 0) return;

    const entitledSet = await this.getTenantEntitledCapabilityIds(companyId);
    const nonEntitled = capabilityIds.filter((id) => !entitledSet.has(id));

    if (nonEntitled.length > 0) {
      // Look up names/slugs for meaningful error feedback
      const nonEntitledCaps = await prisma.systemCapability.findMany({
        where: { id: { in: nonEntitled } },
        select: { id: true, name: true, slug: true },
      });

      const labelList = nonEntitledCaps.map((c) => `${c.name} (${c.slug})`).join(', ');

      throw new AppError(
        'PERMISSION_NOT_ENTITLED',
        `Cannot grant capabilities [${labelList || nonEntitled.join(', ')}] because they are not entitled to your organization.`,
        403,
        { nonEntitledCapabilityIds: nonEntitled }
      );
    }
  }

  /**
   * Deterministic effective permission resolution for a user in a tenant:
   * Effective Access = (Group Permissions ∪ Direct Permissions) ∩ Tenant Entitlements
   */
  public async getEffectivePermissions(
    userId: string,
    companyId: string
  ): Promise<Set<string>> {
    // 1. Check Redis Cache
    const cached = await getCachedEffectivePermissions(companyId, userId);
    if (cached) {
      return new Set(cached);
    }

    // 2. Fetch Active Tenant Entitlements (The Ceiling)
    const entitledSlugs = await this.getTenantEntitledSlugs(companyId);
    if (entitledSlugs.size === 0) {
      await cacheEffectivePermissions(companyId, userId, []);
      return new Set();
    }

    // Fetch user role
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Company Admins, Super Admins and Master Super Admins get ALL tenant-entitled capabilities
    if (
      userRecord?.role === 'COMPANY_ADMIN' ||
      userRecord?.role === 'SUPER_ADMIN' ||
      userRecord?.role === 'MASTER_SUPER_ADMIN'
    ) {
      const effectiveSlugs = Array.from(entitledSlugs);
      await cacheEffectivePermissions(companyId, userId, effectiveSlugs);
      return new Set(effectiveSlugs);
    }

    // 3. Fetch Active Group Permissions for this user
    const userGroups = await prisma.userAccessGroup.findMany({
      where: {
        userId,
        accessGroup: {
          companyId,
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        accessGroup: {
          select: {
            permissions: {
              where: {
                capability: {
                  isActive: true,
                },
              },
              select: {
                capability: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const userAssignedSlugs = new Set<string>();

    for (const ug of userGroups) {
      for (const p of ug.accessGroup.permissions) {
        userAssignedSlugs.add(p.capability.slug);
      }
    }

    // 4. Fetch Direct User Permissions
    const directPermissions = await prisma.userDirectPermission.findMany({
      where: {
        userId,
        companyId,
        capability: {
          isActive: true,
        },
      },
      select: {
        capability: {
          select: {
            slug: true,
          },
        },
      },
    });

    for (const dp of directPermissions) {
      userAssignedSlugs.add(dp.capability.slug);
    }

    // If no custom group or direct permission is assigned, assign default role patterns
    if (userAssignedSlugs.size === 0) {
      const role = userRecord?.role;
      const allCaps = await prisma.systemCapability.findMany({
        where: { isActive: true },
        select: { slug: true },
      });

      const employeePatterns = [
        'attendance.punchin_punchout.*',
        'attendance.regularization.create',
        'attendance.history.view',
        'visits.records.*',
        'sales.orders.*',
        'inspections.audits.*',
        'customers.accounts.view',
        'products.catalogue.view',
        'workforce.org_chart.view',
      ];

      const managerPatterns = [
        ...employeePatterns,
        'attendance.team.view',
        'attendance.regularization.review',
        'tracking.live_map.view',
        'tracking.route_playback.view',
        'workforce.directory.view',
        'customers.accounts.edit',
      ];

      const hrPatterns = [
        ...managerPatterns,
        'attendance.team.company_view',
        'workforce.directory.*',
        'workforce.org_chart.manage',
        'policies.attendance_policies.*',
        'custom_policy_management',
        'custom_policy_management.*',
        'organization.branches.*',
        'organization.departments.*',
        'organization.designations.*',
        'customers.accounts.delete',
        'reports.analytics.export',
      ];

      let matchingPatterns: string[] = [];
      if (role === 'EMPLOYEE') matchingPatterns = employeePatterns;
      else if (role === 'MANAGER') matchingPatterns = managerPatterns;
      else if (role === 'HR') matchingPatterns = hrPatterns;

      for (const c of allCaps) {
        for (const pattern of matchingPatterns) {
          if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -1);
            if (c.slug.startsWith(prefix) || c.slug === pattern.slice(0, -2)) {
              userAssignedSlugs.add(c.slug);
            }
          } else if (c.slug === pattern) {
            userAssignedSlugs.add(c.slug);
          }
        }
      }
    }

    // 5. Intersect with Tenant Entitlement (MANDATORY INVARIANT)
    const effectiveSlugs: string[] = [];
    for (const slug of userAssignedSlugs) {
      if (entitledSlugs.has(slug)) {
        effectiveSlugs.push(slug);
      }
    }

    // 6. Write to Redis Cache (5 min TTL)
    await cacheEffectivePermissions(companyId, userId, effectiveSlugs);

    return new Set(effectiveSlugs);
  }

  /**
   * Evaluates whether a user has all required permission slugs.
   */
  public async hasPermissions(
    userId: string,
    companyId: string,
    requiredSlugs: string[]
  ): Promise<boolean> {
    if (!requiredSlugs || requiredSlugs.length === 0) return true;

    const effectiveSet = await this.getEffectivePermissions(userId, companyId);

    return requiredSlugs.every((slug) => {
      // Supports exact match or wildcard check (e.g. 'attendance.punch.*')
      if (effectiveSet.has(slug)) return true;
      if (slug.endsWith('.*')) {
        const prefix = slug.slice(0, -1);
        for (const eff of effectiveSet) {
          if (eff.startsWith(prefix)) return true;
        }
      }
      return false;
    });
  }

  /**
   * Generates a comprehensive Effective Access Profile with full provenance
   * for Administrator Debugging and Access Auditing.
   */
  public async getEffectiveAccessProfile(
    userId: string,
    companyId: string
  ): Promise<EffectiveAccessProfileDto> {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found within this organization', 404);
    }

    // 1. All Capabilities in the platform
    const allCapabilities = await prisma.systemCapability.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });

    // 2. Tenant Entitlements
    const entitledRecords = await prisma.companyEntitlement.findMany({
      where: { companyId, isEnabled: true },
      select: { capabilityId: true },
    });
    const entitledIdSet = new Set(entitledRecords.map((e) => e.capabilityId));

    // 3. User Groups & Permissions
    const userGroups = await prisma.userAccessGroup.findMany({
      where: {
        userId,
        accessGroup: {
          companyId,
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        accessGroup: {
          include: {
            permissions: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    // 4. Direct User Permissions
    const directPermissions = await prisma.userDirectPermission.findMany({
      where: { userId, companyId },
      include: {
        capability: true,
      },
    });

    // Compute Provenance
    const provenance: EffectiveAccessProfileDto['provenance'] = {};
    const effectiveSlugs: string[] = [];
    const directSlugs: string[] = [];

    // Map group memberships
    const groupMapByCapId = new Map<
      string,
      Array<{ type: 'GROUP'; groupId: string; groupName: string }>
    >();

    for (const ug of userGroups) {
      for (const p of ug.accessGroup.permissions) {
        if (!groupMapByCapId.has(p.capabilityId)) {
          groupMapByCapId.set(p.capabilityId, []);
        }
        groupMapByCapId.get(p.capabilityId)!.push({
          type: 'GROUP',
          groupId: ug.accessGroup.id,
          groupName: ug.accessGroup.name,
        });
      }
    }

    // Map direct permissions
    const directMapByCapId = new Map<string, { type: 'DIRECT'; assignedAt: string }>();
    for (const dp of directPermissions) {
      directMapByCapId.set(dp.capabilityId, {
        type: 'DIRECT',
        assignedAt: dp.createdAt.toISOString(),
      });
      directSlugs.push(dp.capability.slug);
    }

    // Construct full provenance breakdown
    for (const cap of allCapabilities) {
      const isEntitled = entitledIdSet.has(cap.id);
      const groupGrants = groupMapByCapId.get(cap.id) || [];
      const directGrant = directMapByCapId.get(cap.id);

      const grantedVia: Array<
        | { type: 'GROUP'; groupId: string; groupName: string }
        | { type: 'DIRECT'; assignedAt: string }
      > = [...groupGrants];

      if (directGrant) {
        grantedVia.push(directGrant);
      }

      const hasUserAssignment = grantedVia.length > 0;
      const isEffective = hasUserAssignment && isEntitled;

      if (isEffective) {
        effectiveSlugs.push(cap.slug);
      }

      provenance[cap.slug] = {
        slug: cap.slug,
        name: cap.name,
        type: cap.type,
        grantedVia,
        entitled: isEntitled,
        effective: isEffective,
      };
    }

    const assignedGroups = userGroups.map((ug) => ({
      id: ug.accessGroup.id,
      name: ug.accessGroup.name,
      isSystem: ug.accessGroup.isSystem,
      isActive: ug.accessGroup.isActive,
      permissionCount: ug.accessGroup.permissions.length,
    }));

    return {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      companyId,
      companyName: user.company?.name,
      entitledCapabilitySlugs: Array.from(allCapabilities.filter((c) => entitledIdSet.has(c.id)).map((c) => c.slug)),
      effectiveSlugs,
      assignedGroups,
      directPermissionSlugs: directSlugs,
      provenance,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Invalidate cached permissions for a specific user.
   */
  public async invalidateUserPermissions(companyId: string, userId: string): Promise<void> {
    await invalidateUserPermissionCache(companyId, userId);
  }

  /**
   * Invalidate cached permissions for all users in a tenant.
   * Triggered when company entitlements change.
   */
  public async invalidateCompanyPermissions(companyId: string): Promise<void> {
    await invalidateCompanyPermissionCache(companyId);
  }
}
