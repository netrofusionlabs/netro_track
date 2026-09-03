import { AuthorizationRepository } from './authorization.repository';
import { PermissionService } from '../../shared/services/permission.service';
import { AuditService } from '../../shared/services/audit.service';
import { AppError } from '../../shared/errors/AppError';
import {
  CreateAccessGroupInput,
  UpdateAccessGroupInput,
  AssignUserAccessGroupsInput,
  AssignUserDirectPermissionsInput,
  UpdateTenantEntitlementsInput,
} from '@netrotrack/shared';
import { prisma } from '../../shared/config/prisma';

export class AuthorizationService {
  private repository = new AuthorizationRepository();
  private permissionService = PermissionService.getInstance();
  private auditService = new AuditService();

  /**
   * Get all platform capabilities (for Super Admin management).
   */
  public async getPlatformCapabilities() {
    return this.repository.getPlatformCapabilities();
  }

  /**
   * Create a new platform capability (Platform Super Admin).
   */
  public async createCapability(actorId: string, input: any, companyId?: string) {
    const created = await this.repository.createCapability(input);

    // Auto-entitle creator company and master tenant
    const targetCompanyIds = new Set<string>();
    if (companyId) targetCompanyIds.add(companyId);

    const masterCompany = await prisma.company.findFirst({
      where: { code: 'NETRO' },
      select: { id: true },
    });
    if (masterCompany) targetCompanyIds.add(masterCompany.id);

    for (const cId of targetCompanyIds) {
      await prisma.companyEntitlement.upsert({
        where: {
          companyId_capabilityId: {
            companyId: cId,
            capabilityId: created.id,
          },
        },
        update: { isEnabled: true },
        create: {
          companyId: cId,
          capabilityId: created.id,
          isEnabled: true,
        },
      });
    }

    await this.auditService.log({
      userId: actorId,
      action: 'ACCESS_GROUP_CREATED' as any,
      entityType: 'SYSTEM_CAPABILITY',
      entityId: created.id,
      newValues: { slug: created.slug, type: created.type },
    });

    return created;
  }

  /**
   * Update an existing capability (Platform Super Admin).
   */
  public async updateCapability(id: string, actorId: string, input: any) {
    const updated = await this.repository.updateCapability(id, input);

    await this.auditService.log({
      userId: actorId,
      action: 'ACCESS_GROUP_UPDATED' as any,
      entityType: 'SYSTEM_CAPABILITY',
      entityId: id,
      newValues: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  /**
   * Deactivate a capability (Platform Super Admin).
   */
  public async deleteCapability(id: string, actorId: string) {
    const deleted = await this.repository.deleteCapability(id);

    await this.auditService.log({
      userId: actorId,
      action: 'ACCESS_GROUP_DELETED' as any,
      entityType: 'SYSTEM_CAPABILITY',
      entityId: id,
    });

    return { success: true, message: 'Capability deactivated successfully' };
  }

  /**
   * Get capabilities entitled to a specific tenant (for the Access Group builder UI).
   */
  public async getAvailableCapabilitiesForTenant(companyId: string) {
    return this.repository.getAvailableCapabilitiesForTenant(companyId);
  }

  /**
   * List access groups for a tenant.
   */
  public async getTenantAccessGroups(companyId: string) {
    return this.repository.getTenantAccessGroups(companyId);
  }

  /**
   * Get single access group by ID.
   */
  public async getAccessGroupById(companyId: string, id: string) {
    const group = await this.repository.getAccessGroupById(companyId, id);
    if (!group) {
      throw new AppError('ACCESS_GROUP_NOT_FOUND', 'Access Group not found within this organization', 404);
    }
    return group;
  }

  /**
   * Create a new Access Group.
   * STRICT ENFORCEMENT: All capabilityIds must strictly be within tenant entitlement ceiling!
   */
  public async createAccessGroup(
    companyId: string,
    actorId: string,
    input: CreateAccessGroupInput
  ) {
    // 1. Mandatory Invariant Check: Requested capabilities ⊆ Tenant Entitlement Ceiling
    await this.permissionService.validateWithinTenantCeiling(companyId, input.capabilityIds);

    // 2. Check for duplicate name in tenant
    const existing = await prisma.accessGroup.findFirst({
      where: {
        companyId,
        name: input.name.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AppError('ACCESS_GROUP_EXISTS', `An Access Group named '${input.name}' already exists in your organization`, 409);
    }

    // 3. Create group
    const created = await this.repository.createAccessGroup(companyId, {
      name: input.name.trim(),
      description: input.description?.trim(),
      capabilityIds: input.capabilityIds,
    });

    // 4. Audit Log
    await this.auditService.log({
      companyId,
      userId: actorId,
      action: 'ACCESS_GROUP_CREATED',
      entityType: 'ACCESS_GROUP',
      entityId: created.id,
      newValues: {
        name: created.name,
        capabilityCount: input.capabilityIds.length,
      },
    });

    return created;
  }

  /**
   * Update an existing Access Group.
   * STRICT ENFORCEMENT: Any new capabilityIds must strictly be within tenant entitlement ceiling!
   */
  public async updateAccessGroup(
    companyId: string,
    groupId: string,
    actorId: string,
    input: UpdateAccessGroupInput
  ) {
    const existing = await this.repository.getAccessGroupById(companyId, groupId);
    if (!existing) {
      throw new AppError('ACCESS_GROUP_NOT_FOUND', 'Access Group not found within this organization', 404);
    }

    // 1. Mandatory Invariant Check if capabilities are modified
    if (input.capabilityIds && input.capabilityIds.length > 0) {
      await this.permissionService.validateWithinTenantCeiling(companyId, input.capabilityIds);
    }

    // 2. Check name collision if name changed
    if (input.name && input.name.trim() !== existing.name) {
      const duplicate = await prisma.accessGroup.findFirst({
        where: {
          companyId,
          name: input.name.trim(),
          id: { not: groupId },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new AppError('ACCESS_GROUP_EXISTS', `An Access Group named '${input.name}' already exists in your organization`, 409);
      }
    }

    // 3. Update in database
    const updated = await this.repository.updateAccessGroup(companyId, groupId, {
      name: input.name?.trim(),
      description: input.description?.trim(),
      isActive: input.isActive,
      capabilityIds: input.capabilityIds,
    });

    // 4. Invalidate cache for all member users of this group
    const memberUserIds = existing.userMembers.map((m) => m.user.id);
    for (const memberId of memberUserIds) {
      await this.permissionService.invalidateUserPermissions(companyId, memberId);
    }

    // 5. Audit Log
    await this.auditService.log({
      companyId,
      userId: actorId,
      action: 'ACCESS_GROUP_UPDATED',
      entityType: 'ACCESS_GROUP',
      entityId: groupId,
      oldValues: { name: existing.name, isActive: existing.isActive },
      newValues: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  /**
   * Delete an Access Group (Soft Delete).
   * System groups cannot be deleted.
   */
  public async deleteAccessGroup(
    companyId: string,
    groupId: string,
    actorId: string
  ) {
    const existing = await this.repository.getAccessGroupById(companyId, groupId);
    if (!existing) {
      throw new AppError('ACCESS_GROUP_NOT_FOUND', 'Access Group not found within this organization', 404);
    }

    if (existing.isSystem) {
      throw new AppError('CANNOT_DELETE_SYSTEM_GROUP', 'Default system access groups cannot be deleted', 400);
    }

    await this.repository.deleteAccessGroup(companyId, groupId);

    // Invalidate caches for members
    const memberUserIds = existing.userMembers.map((m) => m.user.id);
    for (const memberId of memberUserIds) {
      await this.permissionService.invalidateUserPermissions(companyId, memberId);
    }

    await this.auditService.log({
      companyId,
      userId: actorId,
      action: 'ACCESS_GROUP_DELETED',
      entityType: 'ACCESS_GROUP',
      entityId: groupId,
    });

    return { success: true, message: 'Access group deleted successfully' };
  }

  /**
   * Assign User Access Groups.
   */
  public async assignUserAccessGroups(
    companyId: string,
    targetUserId: string,
    actorId: string,
    input: AssignUserAccessGroupsInput
  ) {
    // 1. Verify target user belongs to company (IDOR prevention)
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, companyId },
    });

    if (!targetUser) {
      throw new AppError('USER_NOT_FOUND', 'Target user does not exist within your organization', 404);
    }

    // 2. Assign groups
    await this.repository.assignUserAccessGroups(
      companyId,
      targetUserId,
      input.accessGroupIds,
      actorId
    );

    // 3. Invalidate target user cache
    await this.permissionService.invalidateUserPermissions(companyId, targetUserId);

    // 4. Audit
    await this.auditService.log({
      companyId,
      userId: actorId,
      action: 'USER_ACCESS_GROUPS_UPDATED',
      entityType: 'USER',
      entityId: targetUserId,
      newValues: { assignedGroupIds: input.accessGroupIds },
    });

    return { success: true, message: 'User access groups updated successfully' };
  }

  /**
   * Assign Direct Permissions to a user.
   * STRICT ENFORCEMENT: Direct permissions must strictly be within tenant entitlement ceiling!
   */
  public async assignUserDirectPermissions(
    companyId: string,
    targetUserId: string,
    actorId: string,
    input: AssignUserDirectPermissionsInput
  ) {
    // 1. Verify target user belongs to company
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, companyId },
    });

    if (!targetUser) {
      throw new AppError('USER_NOT_FOUND', 'Target user does not exist within your organization', 404);
    }

    // 2. Mandatory Invariant Check: Direct permissions ⊆ Tenant Entitlement Ceiling
    await this.permissionService.validateWithinTenantCeiling(companyId, input.capabilityIds);

    // 3. Assign direct permissions
    await this.repository.assignUserDirectPermissions(
      companyId,
      targetUserId,
      input.capabilityIds,
      actorId
    );

    // 4. Invalidate cache
    await this.permissionService.invalidateUserPermissions(companyId, targetUserId);

    // 5. Audit
    await this.auditService.log({
      companyId,
      userId: actorId,
      action: 'USER_DIRECT_PERMISSIONS_UPDATED',
      entityType: 'USER',
      entityId: targetUserId,
      newValues: { directCapabilityCount: input.capabilityIds.length },
    });

    return { success: true, message: 'User direct permissions updated successfully' };
  }

  /**
   * Get User Effective Access Profile with complete provenance (Debug Inspector).
   */
  public async getUserAccessProfile(companyId: string, targetUserId: string) {
    return this.permissionService.getEffectiveAccessProfile(targetUserId, companyId);
  }

  /**
   * Update Tenant Entitlements (Platform Super Admin).
   * CASCADING REVOCATION: Immediately invalidates the entire company's permission cache.
   */
  public async updateTenantEntitlements(
    targetCompanyId: string,
    actorId: string,
    input: UpdateTenantEntitlementsInput
  ) {
    await this.repository.updateTenantEntitlements(targetCompanyId, input.entitlements);

    // Immediate cascading cache flush for all users in this tenant
    await this.permissionService.invalidateCompanyPermissions(targetCompanyId);

    await this.auditService.log({
      companyId: targetCompanyId,
      userId: actorId,
      action: 'TENANT_ENTITLEMENTS_UPDATED',
      entityType: 'COMPANY',
      entityId: targetCompanyId,
      newValues: { updateCount: input.entitlements.length },
    });

    return { success: true, message: 'Tenant entitlements updated successfully' };
  }

  /**
   * Get Tenant Entitlements (Platform Super Admin).
   */
  public async getTenantEntitlements(targetCompanyId: string) {
    return this.repository.getTenantEntitlements(targetCompanyId);
  }
}
