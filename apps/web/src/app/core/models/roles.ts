/**
 * Role vocabulary. Mirrors the `Role` enum in the Prisma schema.
 * MASTER_SUPER_ADMIN bypasses every server-side role check, so it is treated
 * as a superset of every capability on the client too.
 */
export type Role =
  | 'MASTER_SUPER_ADMIN'
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'EMPLOYEE';

export const ALL_ROLES: Role[] = [
  'MASTER_SUPER_ADMIN',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'HR',
  'MANAGER',
  'EMPLOYEE',
];

/** Higher rank outranks lower rank. Used for "can this actor act on that user". */
export const ROLE_RANK: Record<Role, number> = {
  MASTER_SUPER_ADMIN: 60,
  SUPER_ADMIN: 50,
  COMPANY_ADMIN: 40,
  HR: 30,
  MANAGER: 20,
  EMPLOYEE: 10,
};

export const ROLE_LABEL: Record<Role, string> = {
  MASTER_SUPER_ADMIN: 'Master Super Admin',
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Company Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

/** Short form for dense surfaces such as table cells and avatars. */
export const ROLE_SHORT: Record<Role, string> = {
  MASTER_SUPER_ADMIN: 'Master',
  SUPER_ADMIN: 'Platform',
  COMPANY_ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

/**
 * Which operating posture the product should adopt for a role. Drives the
 * Dashboard composition and the default landing surface — not a separate
 * design language, just a different information priority.
 */
export type Persona = 'platform' | 'organisation' | 'team' | 'individual';

export function personaFor(role: Role | null | undefined): Persona {
  switch (role) {
    case 'MASTER_SUPER_ADMIN':
    case 'SUPER_ADMIN':
      return 'platform';
    case 'COMPANY_ADMIN':
    case 'HR':
      return 'organisation';
    case 'MANAGER':
      return 'team';
    default:
      return 'individual';
  }
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABEL[role as Role] ?? role.replace(/_/g, ' ');
}

export function hasRole(role: string | null | undefined, allowed: readonly Role[]): boolean {
  if (!role) return false;
  if (role === 'MASTER_SUPER_ADMIN') return true;
  return allowed.includes(role as Role);
}

export function outranks(actor: string | null | undefined, target: string | null | undefined): boolean {
  if (!actor || !target) return false;
  return (ROLE_RANK[actor as Role] ?? 0) > (ROLE_RANK[target as Role] ?? 0);
}

/* ---- Capability predicates -------------------------------------------------
   Named after what the user is trying to do, so call sites read as intent
   rather than as a role list copied around the codebase. These mirror the
   `requireRoles(...)` guards on the API. ------------------------------------ */

export const CAN = {
  administerPlatform: ['SUPER_ADMIN'] as const,
  manageWorkforce: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'] as const,
  editWorkforce: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
  managePolicies: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
  reviewApprovals: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'] as const,
  viewTeamOperations: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'] as const,
  viewCompanyOperations: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
  manageBranches: ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const,
  manageCatalogue: ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const,
  manageCustomers: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as const,
  deleteCustomers: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
};
