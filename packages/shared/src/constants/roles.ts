export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum UserRole {
  MASTER_SUPER_ADMIN = 'MASTER_SUPER_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

/** Numeric rank: higher = more authority */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 0,
  [UserRole.MANAGER]: 1,
  [UserRole.HR]: 2,
  [UserRole.COMPANY_ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.MASTER_SUPER_ADMIN]: 5,
};

/** Display-friendly label */
export const ROLE_DISPLAY_LABELS: Record<UserRole, string> = {
  [UserRole.MASTER_SUPER_ADMIN]: 'Master Super Admin',
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.COMPANY_ADMIN]: 'Company Admin',
  [UserRole.HR]: 'HR Executive',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.EMPLOYEE]: 'Employee',
};

/** Roles that the given actor can create */
export function getCreatableRoles(actorRole: UserRole): UserRole[] {
  switch (actorRole) {
    case UserRole.MASTER_SUPER_ADMIN:
      return [UserRole.MASTER_SUPER_ADMIN, UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE];
    case UserRole.SUPER_ADMIN:
      return [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE];
    case UserRole.COMPANY_ADMIN:
      return [UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE];
    case UserRole.HR:
      return [UserRole.MANAGER, UserRole.EMPLOYEE];
    case UserRole.MANAGER:
      return [UserRole.EMPLOYEE];
    default:
      return [];
  }
}

export enum TimelineEventType {
  ONBOARDING = 'ONBOARDING',
  DESIGNATION_ASSIGNED = 'DESIGNATION_ASSIGNED',
  DESIGNATION_CHANGED = 'DESIGNATION_CHANGED',
  PROMOTION = 'PROMOTION',
  ACCESS_ROLE_ASSIGNED = 'ACCESS_ROLE_ASSIGNED',
  ACCESS_ROLE_CHANGED = 'ACCESS_ROLE_CHANGED',
  MANAGER_ASSIGNED = 'MANAGER_ASSIGNED',
  MANAGER_CHANGED = 'MANAGER_CHANGED',
  EMPLOYMENT_TYPE_CHANGED = 'EMPLOYMENT_TYPE_CHANGED',
  LOCATION_CHANGED = 'LOCATION_CHANGED',
  DEPARTMENT_CHANGED = 'DEPARTMENT_CHANGED',
  COMPANY_CHANGED = 'COMPANY_CHANGED',
}

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  [TimelineEventType.ONBOARDING]: 'Onboarding',
  [TimelineEventType.DESIGNATION_ASSIGNED]: 'Designation Assigned',
  [TimelineEventType.DESIGNATION_CHANGED]: 'Designation Changed',
  [TimelineEventType.PROMOTION]: 'Promotion',
  [TimelineEventType.ACCESS_ROLE_ASSIGNED]: 'Access Role Assigned',
  [TimelineEventType.ACCESS_ROLE_CHANGED]: 'Access Role Changed',
  [TimelineEventType.MANAGER_ASSIGNED]: 'Reporting Manager Assigned',
  [TimelineEventType.MANAGER_CHANGED]: 'Reporting Manager Changed',
  [TimelineEventType.EMPLOYMENT_TYPE_CHANGED]: 'Employment Type Changed',
  [TimelineEventType.LOCATION_CHANGED]: 'Location Changed',
  [TimelineEventType.DEPARTMENT_CHANGED]: 'Department Changed',
  [TimelineEventType.COMPANY_CHANGED]: 'Company Changed',
};


