import { PrismaClient, CapabilityType } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';

export class AuthorizationRepository {
  /**
   * Get complete hierarchical capability tree.
   */
  public async getPlatformCapabilities() {
    return prisma.systemCapability.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }],
          include: {
            children: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }],
            },
          },
        },
      },
    });
  }

  /**
   * Create a new platform capability (Module, Feature, or Action).
   */
  public async createCapability(data: {
    type: CapabilityType;
    parentId?: string | null;
    key: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    let slug = data.key;
    if (data.parentId) {
      const parent = await prisma.systemCapability.findUnique({
        where: { id: data.parentId },
        select: { slug: true },
      });
      if (parent) {
        slug = `${parent.slug}.${data.key}`;
      }
    }

    return prisma.systemCapability.create({
      data: {
        type: data.type,
        parentId: data.parentId || null,
        key: data.key,
        slug,
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  /**
   * Update an existing capability.
   */
  public async updateCapability(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.systemCapability.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Deactivate a capability.
   */
  public async deleteCapability(id: string) {
    return prisma.systemCapability.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get only the capabilities entitled to a specific tenant.
   */
  public async getAvailableCapabilitiesForTenant(companyId: string) {
    const entitlements = await prisma.companyEntitlement.findMany({
      where: {
        companyId,
        isEnabled: true,
        capability: { isActive: true },
      },
      include: {
        capability: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
      orderBy: {
        capability: {
          sortOrder: 'asc',
        },
      },
    });

    return entitlements.map((e) => e.capability);
  }

  /**
   * List all access groups in a tenant with user member counts and permission counts.
   */
  public async getTenantAccessGroups(companyId: string) {
    return prisma.accessGroup.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            userMembers: true,
            permissions: true,
          },
        },
      },
    });
  }

  /**
   * Get single access group by ID with full assigned capabilities.
   */
  public async getAccessGroupById(companyId: string, id: string) {
    return prisma.accessGroup.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        permissions: {
          include: {
            capability: true,
          },
        },
        userMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new Access Group for a tenant.
   */
  public async createAccessGroup(
    companyId: string,
    data: { name: string; description?: string; capabilityIds: string[] }
  ) {
    return prisma.accessGroup.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        isSystem: false,
        isActive: true,
        permissions: {
          createMany: {
            data: data.capabilityIds.map((cid) => ({
              capabilityId: cid,
            })),
          },
        },
      },
      include: {
        permissions: {
          include: {
            capability: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing Access Group.
   */
  public async updateAccessGroup(
    companyId: string,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean; capabilityIds?: string[] }
  ) {
    return prisma.$transaction(async (tx) => {
      // Update basic fields
      const updatedGroup = await tx.accessGroup.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          isActive: data.isActive,
        },
      });

      // Update permissions if provided
      if (data.capabilityIds) {
        await tx.accessGroupPermission.deleteMany({
          where: { accessGroupId: id },
        });

        if (data.capabilityIds.length > 0) {
          await tx.accessGroupPermission.createMany({
            data: data.capabilityIds.map((cid) => ({
              accessGroupId: id,
              capabilityId: cid,
            })),
          });
        }
      }

      return updatedGroup;
    }, { maxWait: 10000, timeout: 25000 });
  }

  /**
   * Soft delete an access group.
   */
  public async deleteAccessGroup(companyId: string, id: string) {
    return prisma.accessGroup.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Assign a user to Access Groups (replaces existing assignments).
   */
  public async assignUserAccessGroups(
    companyId: string,
    userId: string,
    accessGroupIds: string[],
    assignedById?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Verify all groups belong to the company
      const validGroups = await tx.accessGroup.findMany({
        where: {
          id: { in: accessGroupIds },
          companyId,
          deletedAt: null,
        },
        select: { id: true },
      });

      const validGroupIds = validGroups.map((g) => g.id);

      // Remove current group assignments
      await tx.userAccessGroup.deleteMany({
        where: { userId },
      });

      // Create new group assignments
      if (validGroupIds.length > 0) {
        await tx.userAccessGroup.createMany({
          data: validGroupIds.map((gid) => ({
            userId,
            accessGroupId: gid,
            assignedById,
          })),
        });
      }

      return validGroupIds;
    }, { maxWait: 10000, timeout: 25000 });
  }

  /**
   * Assign Direct Permissions to a user (replaces existing direct permissions).
   */
  public async assignUserDirectPermissions(
    companyId: string,
    userId: string,
    capabilityIds: string[],
    assignedById?: string
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.userDirectPermission.deleteMany({
        where: { userId, companyId },
      });

      if (capabilityIds.length > 0) {
        await tx.userDirectPermission.createMany({
          data: capabilityIds.map((cid) => ({
            userId,
            companyId,
            capabilityId: cid,
            assignedById,
          })),
        });
      }

      return capabilityIds;
    }, { maxWait: 10000, timeout: 25000 });
  }

  /**
   * Get all company entitlements.
   */
  public async getTenantEntitlements(companyId: string) {
    return prisma.companyEntitlement.findMany({
      where: { companyId },
      include: {
        capability: true,
      },
      orderBy: {
        capability: {
          sortOrder: 'asc',
        },
      },
    });
  }

  /**
   * Update company entitlements.
   */
  public async updateTenantEntitlements(
    companyId: string,
    entitlements: Array<{ capabilityId: string; isEnabled: boolean }>
  ) {
    return prisma.$transaction(async (tx) => {
      for (const ent of entitlements) {
        await tx.companyEntitlement.upsert({
          where: {
            companyId_capabilityId: {
              companyId,
              capabilityId: ent.capabilityId,
            },
          },
          update: {
            isEnabled: ent.isEnabled,
          },
          create: {
            companyId,
            capabilityId: ent.capabilityId,
            isEnabled: ent.isEnabled,
          },
        });
      }
    }, { maxWait: 10000, timeout: 25000 });
  }
}
