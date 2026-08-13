import { useAuthStore } from '../../features/auth/stores/authStore';
import { UserRole, ROLE_HIERARCHY, getCreatableRoles } from '@netrotrack/shared';

export function usePermissions() {
  const user = useAuthStore((s) => s.user) ?? null;
  const userRole = (user?.role as UserRole) || UserRole.EMPLOYEE;
  const userRank = ROLE_HIERARCHY[userRole] ?? 0;

  const isMasterSuperAdmin = userRole === UserRole.MASTER_SUPER_ADMIN;
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN || isMasterSuperAdmin;
  const isCompanyAdmin = userRole === UserRole.COMPANY_ADMIN || isSuperAdmin;
  const isHr = userRole === UserRole.HR;
  const isManager = userRole === UserRole.MANAGER;
  const isEmployee = userRole === UserRole.EMPLOYEE;

  const creatableRoles = getCreatableRoles(userRole);
  const canCreateUsers = creatableRoles.length > 0;

  // Manager employee creation rule: Manager can create employees, but must NOT see manager selector (auto-assigned to self)
  const showManagerSelector = isCompanyAdmin || isHr;

  const canRemoveUser = (targetRole?: string, targetId?: string) => {
    if (!targetRole) return false;
    const targetEnum = targetRole as UserRole;
    
    // Master Super Admin cannot be removed by anyone
    if (targetEnum === UserRole.MASTER_SUPER_ADMIN) return false;

    // Self removal forbidden
    if (targetId && user?.id === targetId) return false;

    if (isMasterSuperAdmin) return true;

    if (userRole === UserRole.SUPER_ADMIN) {
      return targetEnum !== UserRole.SUPER_ADMIN && (targetEnum as string) !== (UserRole.MASTER_SUPER_ADMIN as string);
    }

    if (userRole === UserRole.COMPANY_ADMIN) {
      return targetEnum === UserRole.HR || targetEnum === UserRole.MANAGER || targetEnum === UserRole.EMPLOYEE || targetEnum === UserRole.COMPANY_ADMIN;
    }

    if (userRole === UserRole.HR) {
      return targetEnum === UserRole.MANAGER || targetEnum === UserRole.EMPLOYEE;
    }

    if (userRole === UserRole.MANAGER) {
      return targetEnum === UserRole.EMPLOYEE;
    }

    return false;
  };

  const canEditUser = (targetRole?: string, targetId?: string) => {
    if (!targetRole) return false;
    const targetEnum = targetRole as UserRole;

    // Master Super Admin's account cannot be edited by lower roles
    if (targetEnum === UserRole.MASTER_SUPER_ADMIN && !isMasterSuperAdmin) return false;

    if (isMasterSuperAdmin || isSuperAdmin || isCompanyAdmin) return true;

    if (isHr) {
      return targetEnum === UserRole.MANAGER || targetEnum === UserRole.EMPLOYEE || targetId === user?.id;
    }

    if (isManager) {
      return targetEnum === UserRole.EMPLOYEE || targetId === user?.id;
    }

    return targetId === user?.id;
  };

  return {
    user,
    userRole,
    userRank,
    isMasterSuperAdmin,
    isSuperAdmin,
    isCompanyAdmin,
    isHr,
    isManager,
    isEmployee,
    isFieldEmployee: isEmployee,
    canCreateUsers,
    creatableRoles,
    showManagerSelector,
    canRemoveUser,
    canEditUser,
  };
}
