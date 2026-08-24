import { Role, User, UserStatus } from '@prisma/client';
import { AppError } from '../errors/AppError';

export interface JwtPayload {
  id: string;
  companyId: string;
  employeeId: string;
  role: Role;
}

const EMP_ROLE: Role = Role.EMPLOYEE as Role;

export const ROLE_RANK: Record<string, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  HR: 2,
  COMPANY_ADMIN: 3,
  SUPER_ADMIN: 4,
  MASTER_SUPER_ADMIN: 5,
};

export class AuthorizationService {
  /**
   * Check if an actor role is allowed to create a user with target role.
   */
  public canCreateRole(actorRole: Role, targetRole: Role): boolean {
    const isTargetEmployee =
      (targetRole as string) === 'EMPLOYEE' ||
      targetRole === EMP_ROLE;

    if (actorRole === Role.MASTER_SUPER_ADMIN) {
      return targetRole !== Role.MASTER_SUPER_ADMIN;
    }
    if (actorRole === Role.SUPER_ADMIN) {
      return (
        targetRole === Role.COMPANY_ADMIN ||
        targetRole === Role.HR ||
        targetRole === Role.MANAGER ||
        isTargetEmployee
      );
    }
    if (actorRole === Role.COMPANY_ADMIN) {
      return targetRole === Role.HR || targetRole === Role.MANAGER || isTargetEmployee;
    }
    if (actorRole === Role.HR) {
      return targetRole === Role.MANAGER || isTargetEmployee;
    }
    if (actorRole === Role.MANAGER) {
      return false;
    }
    return false;
  }

  /**
   * Check if actor is Master Super Admin.
   */
  public isMasterSuperAdmin(role: Role): boolean {
    return role === Role.MASTER_SUPER_ADMIN;
  }

  /**
   * Ensure target is not Master Super Admin when performing destructive/modifying operations.
   */
  public assertNotMasterTarget(targetUser: { role: Role; id?: string }, actorId?: string): void {
    if (targetUser.role === Role.MASTER_SUPER_ADMIN) {
      throw new AppError(
        'FORBIDDEN_MASTER_SUPER_ADMIN_MUTATION',
        'The Master Super Admin account cannot be deleted, deactivated, or demoted',
        403
      );
    }
  }

  /**
   * Enforce company scope: non-Super-Admin users can only access their own company's resources.
   */
  public assertCompanyScope(actor: JwtPayload, targetCompanyId?: string | null): void {
    if (actor.role === Role.MASTER_SUPER_ADMIN || actor.role === Role.SUPER_ADMIN) {
      return;
    }
    if (!targetCompanyId || actor.companyId !== targetCompanyId) {
      throw new AppError('FORBIDDEN_CROSS_TENANT', 'Cross-tenant access forbidden', 403);
    }
  }

  /**
   * Enforce manager employee creation scope:
   * If actor is MANAGER, managerId MUST be forced to actor.id.
   * Admins can assign any managerId or leave it unassigned (null).
   */
  public enforceManagerCreationScope(
    actorRole: Role,
    actorId: string,
    requestedManagerId?: string | null
  ): string | null {
    if (actorRole === Role.MANAGER) {
      return actorId;
    }
    return requestedManagerId ?? null;
  }

  /**
   * Check if actor can delete/deactivate a target user.
   */
  public canRemoveUser(actor: JwtPayload, targetUser: { role: Role; id: string }): boolean {
    if (targetUser.role === Role.MASTER_SUPER_ADMIN) return false;
    if (actor.id === targetUser.id) return false;

    const targetRank = ROLE_RANK[targetUser.role];
    if (targetRank > ROLE_RANK[actor.role]) return false;

    if (actor.role === Role.MASTER_SUPER_ADMIN) return true;

    if (actor.role === Role.SUPER_ADMIN) {
      // Super Admin cannot remove another Super Admin or Master Super Admin
      return targetUser.role !== Role.SUPER_ADMIN && (targetUser.role as string) !== 'MASTER_SUPER_ADMIN';
    }

    if (actor.role === Role.COMPANY_ADMIN) {
      // Company Admin can manage HR, Managers and Employees in their company.
      return targetRank < ROLE_RANK[Role.COMPANY_ADMIN] || targetUser.role === Role.COMPANY_ADMIN;
    }

    if (actor.role === Role.HR) {
      // HR can manage Managers and Employees in their company
      return targetUser.role === Role.MANAGER || targetUser.role === EMP_ROLE;
    }

    if (actor.role === Role.MANAGER) {
      // Manager can only manage assigned employees
      return targetUser.role === EMP_ROLE && (targetUser as any).managerId === actor.id;
    }

    return false;
  }

  /**
   * Check if actor can view/manage target user.
   */
  public canManageUser(actor: JwtPayload, targetUser: User): boolean {
    this.assertCompanyScope(actor, targetUser.companyId);

    const actorRank = ROLE_RANK[actor.role];
    const targetRank = ROLE_RANK[targetUser.role];

    // Rule: Lower rank roles cannot access/manage higher rank role users
    if (targetRank > actorRank) {
      return false;
    }

    if (actor.role === Role.MASTER_SUPER_ADMIN || actor.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (actor.role === Role.COMPANY_ADMIN) {
      return targetRank <= ROLE_RANK[Role.COMPANY_ADMIN];
    }

    if (actor.role === Role.HR) {
      return targetRank <= ROLE_RANK[Role.HR];
    }

    if (actor.role === Role.MANAGER) {
      // Manager can ONLY manage their assigned employees or self
      return targetUser.id === actor.id || (targetUser.role === EMP_ROLE && targetUser.managerId === actor.id);
    }

    if (actor.role === EMP_ROLE) {
      return targetUser.id === actor.id;
    }

    return false;
  }
}
