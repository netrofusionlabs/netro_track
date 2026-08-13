import { UserManagementRepository, UserFilterOptions, PaginatedResult } from './user-management.repository';
import { TimelineRepository } from './timeline.repository';
import { AuthorizationService, JwtPayload } from '../../shared/services/authorization.service';
import { AuditService } from '../../shared/services/audit.service';
import { AppError } from '../../shared/errors/AppError';
import { Role, UserStatus, User, TimelineEventType } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';
import argon2 from 'argon2';
import { CreateUserInput, UpdateUserInput, RemoveManagerInput, ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';

export class UserManagementService {
  private userRepo = new UserManagementRepository();
  private timelineRepo = new TimelineRepository(prisma);
  private authService = new AuthorizationService();
  private auditService = new AuditService();

  /**
   * List users in company scope with filters and pagination.
   */
  public async getUsers(actor: JwtPayload, filters?: UserFilterOptions): Promise<PaginatedResult<User>> {
    let companyId = actor.companyId;

    // Master Super Admin or Super Admin can view all companies unless a specific companyId filter is provided
    if (this.authService.isMasterSuperAdmin(actor.role) || actor.role === Role.SUPER_ADMIN) {
      companyId = filters?.companyId || '';
    }

    const { ROLE_RANK } = require('../../shared/services/authorization.service');
    const actorRank = ROLE_RANK[actor.role] ?? 0;

    // Build allowedRoles from valid Prisma Role enum values only (excluding legacy strings)
    const validRoles = (Object.values(Role) as string[]).filter((r) => r !== 'FIELD_EMPLOYEE') as Role[];
    const allowedRoles = validRoles.filter(
      (r) => (ROLE_RANK[r] ?? 0) <= actorRank
    );

    const mergedFilters: UserFilterOptions = {
      ...filters,
      allowedRoles,
    };

    // Managers can ONLY see their assigned subordinates or themselves
    if (actor.role === Role.MANAGER) {
      mergedFilters.managerId = actor.id;
    }

    return this.userRepo.findUsersByCompany(companyId, mergedFilters);
  }

  /**
   * Get user by ID with authorization checks.
   */
  public async getUserById(actor: JwtPayload, id: string): Promise<User> {
    const target = await this.userRepo.findById(id);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    if (!this.authService.canManageUser(actor, target)) {
      throw new AppError('FORBIDDEN', 'Access denied to this user record', 403);
    }

    return target;
  }

  /**
   * Create a new user with strict hierarchy enforcement.
   */
  public async createUser(actor: JwtPayload, input: CreateUserInput): Promise<User> {
    // 1. Check if actor can create the requested role
    if (!this.authService.canCreateRole(actor.role, input.role as Role)) {
      throw new AppError(
        'FORBIDDEN_ROLE_CREATION',
        `Role ${actor.role} is not authorized to create a ${input.role} user`,
        403
      );
    }

    // 2. Ensure only ONE Master Super Admin exists system-wide
    if (input.role === (Role.MASTER_SUPER_ADMIN as any)) {
      const masterCount = await this.userRepo.countMasterSuperAdmins();
      if (masterCount >= 1) {
        throw new AppError(
          'MASTER_SUPER_ADMIN_EXISTS',
          'Only one Master Super Admin account can exist in the system',
          409
        );
      }
    }

    // 3. Determine target company ID
    let targetCompanyId = actor.companyId;
    if ((actor.role === Role.MASTER_SUPER_ADMIN || actor.role === Role.SUPER_ADMIN) && input.companyId) {
      targetCompanyId = input.companyId;
    }

    if (!targetCompanyId && input.role !== Role.MASTER_SUPER_ADMIN) {
      throw new AppError('MISSING_COMPANY_ID', 'Company ID is required to create this user', 400);
    }

    // 4. Super Admin & Master Super Admin roles are platform-only (NetroTrack platform company with code 'NETRO')
    if (input.role === Role.SUPER_ADMIN || input.role === (Role.MASTER_SUPER_ADMIN as any)) {
      if (targetCompanyId) {
        const targetComp = await prisma.company.findUnique({ where: { id: targetCompanyId } });
        if (targetComp && targetComp.code !== 'NETRO' && !targetComp.name.toLowerCase().includes('netro')) {
          throw new AppError(
            'INVALID_ROLE_FOR_TENANT',
            'Super Admin role can only be assigned to the platform company (NetroTrack)',
            400
          );
        }
      }
    }

    // 4. Verify employeeId uniqueness within company
    if (targetCompanyId) {
      const existingEmp = await prisma.user.findFirst({
        where: {
          companyId: targetCompanyId,
          employeeId: { equals: input.employeeId, mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (existingEmp) {
        throw new AppError(
          'EMPLOYEE_ID_ALREADY_EXISTS',
          `Employee ID '${input.employeeId}' already exists in this company`,
          409
        );
      }
    }

    // 5. Verify email uniqueness globally if provided
    if (input.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' }, deletedAt: null },
      });
      if (existingEmail) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'Email address is already registered', 409);
      }
    }

    // 6. Manager creation rule: If actor is MANAGER, force managerId = actor.id
    // Ignore any requested managerId supplied by Manager actor
    const finalManagerId = this.authService.enforceManagerCreationScope(
      actor.role,
      actor.id,
      input.managerId
    );

    // 7. Validate managerId if provided (must belong to SAME company, be ACTIVE, and outrank target user)
    if (finalManagerId) {
      const managerUser = await prisma.user.findFirst({
        where: {
          id: finalManagerId,
          companyId: targetCompanyId,
          deletedAt: null,
        },
      });
      if (!managerUser) {
        throw new AppError(
          'INVALID_MANAGER',
          'Assigned supervisor not found or belongs to another company',
          400
        );
      }
      const { ROLE_RANK } = require('../../shared/services/authorization.service');
      const targetRank = ROLE_RANK[input.role as string] ?? 0;
      const supervisorRank = ROLE_RANK[managerUser.role as string] ?? 0;
      if (supervisorRank <= targetRank) {
        throw new AppError('INVALID_MANAGER_ROLE', 'Assigned supervisor must have a higher role rank than the created user', 400);
      }
      if (managerUser.status !== UserStatus.ACTIVE) {
        throw new AppError('INACTIVE_MANAGER', 'Cannot assign employees to an inactive supervisor', 400);
      }
    }

    // 8. Hash password (default: Password123!)
    const rawPassword = input.password || 'Password123!';
    const passwordHash = await argon2.hash(rawPassword);

    // Evaluate GPS tracking permission based on Company policy
    let finalIsGpsTracked = (input as any).isGpsTracked ?? true;
    const resolvedCompanyId = targetCompanyId || actor.companyId;
    if (resolvedCompanyId) {
      const targetCompany = await prisma.company.findUnique({ where: { id: resolvedCompanyId } });
      if (targetCompany && targetCompany.isGpsEnabled === false) {
        finalIsGpsTracked = false; // Company policy overrides user setting
      }
    }

    // Perform user creation and initial timeline records inside ONE database transaction
    const newUser = await prisma.$transaction(async (tx) => {
      let finalDesignationId = input.designationId;
      const desigName = input.designationName ? input.designationName.trim() : null;
      if (!finalDesignationId && desigName && resolvedCompanyId) {
        let existingDesignation = await tx.designation.findFirst({
          where: {
            companyId: resolvedCompanyId,
            name: { equals: desigName, mode: 'insensitive' },
          },
        });
        if (!existingDesignation) {
          existingDesignation = await tx.designation.create({
            data: {
              companyId: resolvedCompanyId,
              name: desigName,
            },
          });
        }
        finalDesignationId = existingDesignation.id;
      }

      const created = await tx.user.create({
        data: {
          company: { connect: { id: resolvedCompanyId } },
          employeeId: input.employeeId,
          name: input.name,
          email: input.email || null,
          personalEmail: input.personalEmail || null,
          phone: input.phone || null,
          secondaryPhone: input.secondaryPhone || null,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone: input.emergencyContactPhone || null,
          linkedinUrl: input.linkedinUrl || null,
          twitterUrl: input.twitterUrl || null,
          bloodGroup: input.bloodGroup || null,
          passwordHash,
          role: (input.role === 'EMPLOYEE' ? Role.EMPLOYEE : input.role) as Role,
          status: UserStatus.ACTIVE,
          isGpsTracked: finalIsGpsTracked,
          manager: finalManagerId ? { connect: { id: finalManagerId } } : undefined,
          branch: input.branchId ? { connect: { id: input.branchId } } : undefined,
          department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
          designation: finalDesignationId ? { connect: { id: finalDesignationId } } : undefined,
        },
      });

      const actorUser = actor.id ? await tx.user.findUnique({ where: { id: actor.id } }) : null;
      const actorName = actorUser?.name || 'System Administrator';
      const effectiveDate = new Date();

      // 1. Record Onboarding Timeline Event
      await this.timelineRepo.createTimelineEventInTx(tx, {
        userId: created.id,
        companyId: resolvedCompanyId,
        eventType: TimelineEventType.ONBOARDING,
        title: 'Onboarding',
        description: `Employee onboarded to company`,
        newValue: 'Joined Organization',
        changedByUserId: actor.id || null,
        changedByName: actorName,
        effectiveDate,
      });

      // 2. Record Designation Assigned Timeline Event
      if (desigName) {
        await this.timelineRepo.createTimelineEventInTx(tx, {
          userId: created.id,
          companyId: resolvedCompanyId,
          eventType: TimelineEventType.DESIGNATION_ASSIGNED,
          title: 'Designation Assigned',
          previousValue: 'None',
          newValue: desigName,
          changedByUserId: actor.id || null,
          changedByName: actorName,
          effectiveDate,
        });
      }

      // 3. Record Access Role Assigned Timeline Event
      const roleLabel = ROLE_DISPLAY_LABELS[created.role as unknown as UserRole] || created.role;
      await this.timelineRepo.createTimelineEventInTx(tx, {
        userId: created.id,
        companyId: resolvedCompanyId,
        eventType: TimelineEventType.ACCESS_ROLE_ASSIGNED,
        title: 'Access Role Assigned',
        previousValue: 'None',
        newValue: roleLabel,
        changedByUserId: actor.id || null,
        changedByName: actorName,
        effectiveDate,
      });

      // 4. Record Reporting Manager Assigned Timeline Event
      if (finalManagerId) {
        const mgr = await tx.user.findUnique({ where: { id: finalManagerId } });
        if (mgr) {
          await this.timelineRepo.createTimelineEventInTx(tx, {
            userId: created.id,
            companyId: resolvedCompanyId,
            eventType: TimelineEventType.MANAGER_ASSIGNED,
            title: 'Reporting Manager Assigned',
            previousValue: 'None',
            newValue: mgr.name,
            changedByUserId: actor.id || null,
            changedByName: actorName,
            effectiveDate,
          });
        }
      }

      return created;
    });

    await this.auditService.log({
      companyId: targetCompanyId,
      userId: actor.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      newValues: {
        employeeId: newUser.employeeId,
        name: newUser.name,
        role: newUser.role,
        managerId: newUser.managerId,
      },
    });

    return newUser;
  }

  /**
   * Update user details.
   */
  public async updateUser(actor: JwtPayload, targetId: string, input: UpdateUserInput): Promise<User> {
    const target = await this.userRepo.findById(targetId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    this.authService.assertCompanyScope(actor, target.companyId);

    if (!this.authService.canManageUser(actor, target)) {
      throw new AppError('FORBIDDEN', 'You do not have permission to modify this user', 403);
    }

    // If changing role, check self-role edit lock, HR rank, and role creation permissions
    if (input.role && input.role !== target.role) {
      if (actor.id === targetId) {
        throw new AppError('FORBIDDEN_SELF_ROLE_EDIT', 'You cannot modify your own system access role', 403);
      }

      const { ROLE_RANK } = require('../../shared/services/authorization.service');
      const actorRank = ROLE_RANK[actor.role] ?? 0;
      if (actorRank < (ROLE_RANK[Role.HR] ?? 2)) {
        throw new AppError('FORBIDDEN_ROLE_EDIT', 'Access role modification requires HR level authority or above', 403);
      }

      this.authService.assertNotMasterTarget(target, actor.id);
      if (!this.authService.canCreateRole(actor.role, input.role as Role)) {
        throw new AppError('FORBIDDEN', `Not authorized to assign role ${input.role}`, 403);
      }
      if (input.role === Role.SUPER_ADMIN || input.role === (Role.MASTER_SUPER_ADMIN as any)) {
        const targetComp = await prisma.company.findUnique({ where: { id: target.companyId } });
        if (targetComp && targetComp.code !== 'NETRO' && !targetComp.name.toLowerCase().includes('netro')) {
          throw new AppError(
            'INVALID_ROLE_FOR_TENANT',
            'Super Admin role can only be assigned to the platform company (NetroTrack)',
            400
          );
        }
      }
    }

    // Validate email uniqueness if changing
    if (input.email && input.email !== target.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' }, deletedAt: null },
      });
      if (existingEmail && existingEmail.id !== targetId) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'Email address is already registered', 409);
      }
    }

    // Validate managerId if changing — supervisor must be active and outrank the target.
    if (input.managerId !== undefined && input.managerId !== target.managerId) {
      if (input.managerId) {
        const { ROLE_RANK } = require('../../shared/services/authorization.service');
        const effectiveTargetRole = (input.role as string) ?? (target.role as string);
        const targetRank: number = ROLE_RANK[effectiveTargetRole] ?? 0;
        const mgr = await prisma.user.findFirst({
          where: { id: input.managerId, companyId: target.companyId, deletedAt: null },
        });
        if (!mgr || mgr.status !== UserStatus.ACTIVE) {
          throw new AppError('INVALID_MANAGER', 'Target supervisor is invalid, inactive, or in another company', 400);
        }
        const supervisorRank: number = ROLE_RANK[mgr.role as string] ?? 0;
        if (supervisorRank <= targetRank) {
          throw new AppError('INVALID_MANAGER', 'Supervisor must have a higher role rank than the target user', 400);
        }
      }
    }

    // Capture old designation name for timeline diff
    const oldDesignationName = (target as any).designation?.name || null;
    let newDesignationName: string | null = oldDesignationName;

    // Normalize role string to actual Prisma enum value.
    const normalizeRole = (r: string): Role =>
      ((Role as any)[r] ?? r) as Role;

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.personalEmail !== undefined) updateData.personalEmail = input.personalEmail;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.secondaryPhone !== undefined) updateData.secondaryPhone = input.secondaryPhone;
    if (input.emergencyContactName !== undefined) updateData.emergencyContactName = input.emergencyContactName;
    if (input.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = input.emergencyContactPhone;
    if (input.linkedinUrl !== undefined) updateData.linkedinUrl = input.linkedinUrl;
    if (input.twitterUrl !== undefined) updateData.twitterUrl = input.twitterUrl;
    if (input.bloodGroup !== undefined) updateData.bloodGroup = input.bloodGroup;
    if (input.role !== undefined) updateData.role = normalizeRole(input.role as string);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.managerId !== undefined) updateData.managerId = input.managerId;

    const updated = await prisma.$transaction(async (tx) => {
      if (input.designationName !== undefined && !input.designationId) {
        if (input.designationName) {
          const dName = input.designationName.trim();
          newDesignationName = dName;
          let existingDesignation = await tx.designation.findFirst({
            where: { companyId: target.companyId, name: { equals: dName, mode: 'insensitive' } },
          });
          if (!existingDesignation) {
            existingDesignation = await tx.designation.create({
              data: { companyId: target.companyId, name: dName },
            });
          }
          updateData.designationId = existingDesignation.id;
        } else {
          updateData.designationId = null;
          newDesignationName = null;
        }
      } else if (input.designationId) {
        const desig = await tx.designation.findUnique({ where: { id: input.designationId } });
        newDesignationName = desig?.name || null;
        updateData.designationId = input.designationId;
      }

      const user = await tx.user.update({
        where: { id: targetId },
        data: updateData,
        include: { designation: true, manager: true },
      });

      const actorUser = actor.id ? await tx.user.findUnique({ where: { id: actor.id } }) : null;
      const actorName = actorUser?.name || 'System Administrator';
      const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();

      // 1. Log Designation Changed or Promotion Event
      if (newDesignationName && newDesignationName !== oldDesignationName) {
        const isPromotion = !!input.isPromotion;
        await this.timelineRepo.createTimelineEventInTx(tx, {
          userId: targetId,
          companyId: target.companyId,
          eventType: isPromotion ? TimelineEventType.PROMOTION : TimelineEventType.DESIGNATION_CHANGED,
          title: isPromotion ? 'Promotion' : 'Designation Changed',
          previousValue: oldDesignationName || 'None',
          newValue: newDesignationName,
          changedByUserId: actor.id,
          changedByName: actorName,
          effectiveDate,
        });
      }

      // 2. Log Access Role Changed Event
      if (input.role && input.role !== target.role) {
        const oldRoleLabel = ROLE_DISPLAY_LABELS[target.role as unknown as UserRole] || target.role;
        const newRoleLabel = ROLE_DISPLAY_LABELS[input.role as unknown as UserRole] || input.role;
        await this.timelineRepo.createTimelineEventInTx(tx, {
          userId: targetId,
          companyId: target.companyId,
          eventType: TimelineEventType.ACCESS_ROLE_CHANGED,
          title: 'Access Role Changed',
          previousValue: oldRoleLabel,
          newValue: newRoleLabel,
          changedByUserId: actor.id,
          changedByName: actorName,
          effectiveDate,
        });
      }

      // 3. Log Reporting Manager Event
      if (input.managerId !== undefined && input.managerId !== target.managerId) {
        const oldMgr = target.managerId ? await tx.user.findUnique({ where: { id: target.managerId } }) : null;
        const newMgr = input.managerId ? await tx.user.findUnique({ where: { id: input.managerId } }) : null;
        await this.timelineRepo.createTimelineEventInTx(tx, {
          userId: targetId,
          companyId: target.companyId,
          eventType: target.managerId ? TimelineEventType.MANAGER_CHANGED : TimelineEventType.MANAGER_ASSIGNED,
          title: target.managerId ? 'Reporting Manager Changed' : 'Reporting Manager Assigned',
          previousValue: oldMgr?.name || 'None',
          newValue: newMgr?.name || 'None',
          changedByUserId: actor.id,
          changedByName: actorName,
          effectiveDate,
        });
      }

      return user;
    });

    await this.auditService.log({
      companyId: target.companyId,
      userId: actor.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: target.id,
      oldValues: { name: target.name, role: target.role, status: target.status },
      newValues: { name: updated.name, role: updated.role, status: updated.status },
    });

    return updated;
  }

  /**
   * Deactivate a user (soft status change).
   */
  public async deactivateUser(actor: JwtPayload, targetId: string): Promise<User> {
    const target = await this.userRepo.findById(targetId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    this.authService.assertNotMasterTarget(target, actor.id);

    if (!this.authService.canRemoveUser(actor, target)) {
      throw new AppError('FORBIDDEN', 'You do not have permission to deactivate this user', 403);
    }

    // If manager has subordinates, prevent direct deactivation without reassignment
    if (target.role === Role.MANAGER) {
      const subCount = await this.userRepo.countSubordinates(targetId);
      if (subCount > 0) {
        throw new AppError(
          'MANAGER_HAS_SUBORDINATES',
          `Manager has ${subCount} assigned employees. Use the manager removal workflow to reassign employees first.`,
          400
        );
      }
    }

    const updated = await this.userRepo.updateUserStatus(targetId, UserStatus.INACTIVE);

    await this.auditService.log({
      companyId: target.companyId,
      userId: actor.id,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: target.id,
      oldValues: { status: UserStatus.ACTIVE },
      newValues: { status: UserStatus.INACTIVE },
    });

    return updated;
  }

  /**
   * Reactivate an inactive user.
   */
  public async activateUser(actor: JwtPayload, targetId: string): Promise<User> {
    const target = await this.userRepo.findById(targetId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    this.authService.assertCompanyScope(actor, target.companyId);

    const updated = await this.userRepo.updateUserStatus(targetId, UserStatus.ACTIVE);

    await this.auditService.log({
      companyId: target.companyId,
      userId: actor.id,
      action: 'USER_ACTIVATED',
      entityType: 'User',
      entityId: target.id,
      oldValues: { status: UserStatus.INACTIVE },
      newValues: { status: UserStatus.ACTIVE },
    });

    return updated;
  }

  /**
   * ATOMIC Manager Removal Workflow with Employee Reassignment.
   */
  public async removeManager(
    actor: JwtPayload,
    managerId: string,
    input: RemoveManagerInput
  ): Promise<{ message: string; reassignedCount: number; manager: User }> {
    const manager = await this.userRepo.findById(managerId);
    if (!manager) {
      throw new AppError('MANAGER_NOT_FOUND', 'Manager not found', 404);
    }

    this.authService.assertNotMasterTarget(manager, actor.id);
    this.authService.assertCompanyScope(actor, manager.companyId);

    if (manager.role !== Role.MANAGER) {
      throw new AppError('NOT_A_MANAGER', 'Specified user is not a Manager', 400);
    }

    if (!this.authService.canRemoveUser(actor, manager)) {
      throw new AppError('FORBIDDEN', 'You do not have permission to remove this Manager', 403);
    }

    const subordinates = await this.userRepo.findSubordinates(managerId);
    const subIds = subordinates.map((s) => s.id);

    // Validate strategy parameters unconditionally
    if (input.strategy === 'move-to-manager') {
      if (!input.targetManagerId) {
        throw new AppError('MISSING_TARGET_MANAGER', 'Replacement manager ID is required', 400);
      }
      if (input.targetManagerId === managerId) {
        throw new AppError('INVALID_TARGET_MANAGER', 'Cannot reassign employees to the manager being removed', 400);
      }
    } else if (input.strategy === 'individual') {
      if (!input.individualAssignments) {
        throw new AppError('MISSING_INDIVIDUAL_ASSIGNMENTS', 'Individual assignments object is required', 400);
      }
    }

    let reassignedCount = 0;

    // Perform atomic transaction
    await prisma.$transaction(async (tx) => {
      if (input.strategy === 'move-to-manager' && input.targetManagerId) {
        const targetMgr = await tx.user.findFirst({
          where: {
            id: input.targetManagerId,
            companyId: manager.companyId,
            role: Role.MANAGER,
            status: UserStatus.ACTIVE,
            deletedAt: null,
          },
        });
        if (!targetMgr) {
          throw new AppError(
            'INVALID_TARGET_MANAGER',
            'Replacement manager not found, inactive, or belongs to another company',
            400
          );
        }
      }

      if (subIds.length > 0) {
        if (input.strategy === 'move-to-unassigned') {
          await this.userRepo.bulkUpdateManagerId(subIds, null, tx);
          reassignedCount = subIds.length;
        } else if (input.strategy === 'move-to-manager' && input.targetManagerId) {
          await this.userRepo.bulkUpdateManagerId(subIds, input.targetManagerId, tx);
          reassignedCount = subIds.length;
        } else if (input.strategy === 'individual' && input.individualAssignments) {
          for (const empId of subIds) {
            const newMgrId = input.individualAssignments[empId] ?? null;
            if (newMgrId) {
              const checkMgr = await tx.user.findFirst({
                where: {
                  id: newMgrId,
                  companyId: manager.companyId,
                  role: Role.MANAGER,
                  status: UserStatus.ACTIVE,
                  deletedAt: null,
                },
              });
              if (!checkMgr) {
                throw new AppError(
                  'INVALID_TARGET_MANAGER',
                  `Assigned manager '${newMgrId}' is invalid, inactive, or in another company`,
                  400
                );
              }
            }
            await tx.user.update({
              where: { id: empId },
              data: { managerId: newMgrId },
            });
            reassignedCount++;
          }
        }
      }

      // Deactivate Manager
      await tx.user.update({
        where: { id: managerId },
        data: { status: UserStatus.INACTIVE },
      });
    });

    // Write audit logs after successful transaction
    await this.auditService.log({
      companyId: manager.companyId,
      userId: actor.id,
      action: 'MANAGER_REMOVED',
      entityType: 'User',
      entityId: manager.id,
      metadata: {
        managerName: manager.name,
        strategy: input.strategy,
        reassignedEmployeeCount: reassignedCount,
      },
    });

    const updatedManager = await this.userRepo.findById(managerId);

    return {
      message: `Manager '${manager.name}' successfully removed. ${reassignedCount} employees reassigned.`,
      reassignedCount,
      manager: updatedManager!,
    };
  }

  /**
   * Get list of active managers in company (for selection dropdowns).
   */
  public async getCompanyManagers(actor: JwtPayload, companyId?: string): Promise<User[]> {
    const targetCompanyId = companyId || actor.companyId;
    this.authService.assertCompanyScope(actor, targetCompanyId);
    return this.userRepo.findManagersByCompany(targetCompanyId);
  }

  /**
   * Get eligible supervisors for the given target role within the company.
   * Returns users ranked strictly above targetRole — used in the Add User form.
   */
  public async getSupervisors(actor: JwtPayload, targetRole: string, companyId?: string, search?: string, excludeUserId?: string): Promise<User[]> {
    const targetCompanyId = companyId || actor.companyId;
    this.authService.assertCompanyScope(actor, targetCompanyId);
    return this.userRepo.findSupervisorsByCompany(targetCompanyId, targetRole, search, excludeUserId);
  }

  /**
   * Get unassigned employees in company.
   */
  public async getUnassignedEmployees(actor: JwtPayload, companyId?: string): Promise<User[]> {
    const targetCompanyId = companyId || actor.companyId;
    this.authService.assertCompanyScope(actor, targetCompanyId);
    return this.userRepo.findUnassignedEmployees(targetCompanyId);
  }

  /**
   * Reset target user's password and/or MPIN to default values.
   * Allowed only if actorRank > targetRank (or Master Super Admin).
   */
  public async resetUserCredentials(
    actor: JwtPayload,
    targetId: string,
    options?: { resetPassword?: boolean; resetMpin?: boolean }
  ): Promise<{ message: string; defaultPassword?: string }> {
    const target = await this.userRepo.findById(targetId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    this.authService.assertNotMasterTarget(target, actor.id);
    this.authService.assertCompanyScope(actor, target.companyId);

    const { ROLE_RANK } = require('../../shared/services/authorization.service');
    const actorRank = ROLE_RANK[actor.role] ?? 0;
    const targetRank = ROLE_RANK[target.role] ?? 0;

    if (actor.role !== Role.MASTER_SUPER_ADMIN && actorRank <= targetRank) {
      throw new AppError(
        'FORBIDDEN',
        'You can only reset credentials for users with a lower role rank',
        403
      );
    }

    const resetPassword = options?.resetPassword !== false;
    const resetMpin = options?.resetMpin !== false;

    const updateData: any = {};
    const defaultPassword = 'Password123!';

    if (resetPassword) {
      updateData.passwordHash = await argon2.hash(defaultPassword);
    }
    if (resetMpin) {
      updateData.mpinHash = null;
    }

    await prisma.user.update({
      where: { id: targetId },
      data: updateData,
    });

    await this.auditService.log({
      companyId: target.companyId,
      userId: actor.id,
      action: 'RESET_CREDENTIALS',
      entityType: 'USER',
      entityId: targetId,
      metadata: { resetPassword, resetMpin, targetEmployeeId: target.employeeId },
    });

    return {
      message: `Credentials for ${target.name} (${target.employeeId}) have been reset to default`,
      defaultPassword: resetPassword ? defaultPassword : undefined,
    };
  }

  /**
   * Fetch chronological timeline audit events for a target user with scope checks.
   */
  public async getUserTimeline(actor: JwtPayload, targetId: string) {
    const target = await this.userRepo.findById(targetId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }
    this.authService.assertCompanyScope(actor, target.companyId);
    return this.timelineRepo.findUserTimeline(targetId);
  }
}
