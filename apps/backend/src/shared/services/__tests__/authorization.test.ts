import { AuthorizationService } from '../authorization.service';
import { Role, UserStatus, User } from '@prisma/client';
import { AppError } from '../../errors/AppError';

const EMP_ROLE = Role.EMPLOYEE;

describe('AuthorizationService Unit Tests', () => {
  let authService: AuthorizationService;

  beforeEach(() => {
    authService = new AuthorizationService();
  });

  describe('canCreateRole', () => {
    it('MASTER_SUPER_ADMIN can create any role except another MASTER_SUPER_ADMIN', () => {
      expect(authService.canCreateRole(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
      expect(authService.canCreateRole(Role.MASTER_SUPER_ADMIN, Role.COMPANY_ADMIN)).toBe(true);
      expect(authService.canCreateRole(Role.MASTER_SUPER_ADMIN, Role.MANAGER)).toBe(true);
      expect(authService.canCreateRole(Role.MASTER_SUPER_ADMIN, EMP_ROLE)).toBe(true);
      expect(authService.canCreateRole(Role.MASTER_SUPER_ADMIN, Role.MASTER_SUPER_ADMIN)).toBe(false);
    });

    it('SUPER_ADMIN cannot create another SUPER_ADMIN or MASTER_SUPER_ADMIN', () => {
      expect(authService.canCreateRole(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN)).toBe(false);
      expect(authService.canCreateRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(false);
      expect(authService.canCreateRole(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)).toBe(true);
    });

    it('COMPANY_ADMIN can create MANAGER and EMPLOYEE', () => {
      expect(authService.canCreateRole(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)).toBe(false);
      expect(authService.canCreateRole(Role.COMPANY_ADMIN, Role.MANAGER)).toBe(true);
      expect(authService.canCreateRole(Role.COMPANY_ADMIN, EMP_ROLE)).toBe(true);
    });

    it('MANAGER can only create EMPLOYEE', () => {
      expect(authService.canCreateRole(Role.MANAGER, Role.MANAGER)).toBe(false);
      expect(authService.canCreateRole(Role.MANAGER, Role.COMPANY_ADMIN)).toBe(false);
      expect(authService.canCreateRole(Role.MANAGER, EMP_ROLE)).toBe(true);
    });
  });

  describe('assertNotMasterTarget', () => {
    it('throws AppError 403 when target is MASTER_SUPER_ADMIN', () => {
      expect(() => {
        authService.assertNotMasterTarget({ role: Role.MASTER_SUPER_ADMIN, id: 'msa-1' });
      }).toThrow(AppError);
    });

    it('does not throw when target is not MASTER_SUPER_ADMIN', () => {
      expect(() => {
        authService.assertNotMasterTarget({ role: Role.SUPER_ADMIN, id: 'sa-1' });
      }).not.toThrow();
    });
  });

  describe('assertCompanyScope', () => {
    it('allows MASTER_SUPER_ADMIN and SUPER_ADMIN cross-company access', () => {
      const actor = { id: 'sa-1', companyId: 'comp-1', employeeId: 'SUP001', role: Role.SUPER_ADMIN };
      expect(() => authService.assertCompanyScope(actor, 'comp-2')).not.toThrow();
    });

    it('throws 403 for COMPANY_ADMIN trying to access another company', () => {
      const actor = { id: 'admin-1', companyId: 'comp-1', employeeId: 'ADM001', role: Role.COMPANY_ADMIN };
      expect(() => authService.assertCompanyScope(actor, 'comp-2')).toThrow(AppError);
    });
  });

  describe('enforceManagerCreationScope', () => {
    it('forces managerId = actor.id when actor is MANAGER', () => {
      const managerId = authService.enforceManagerCreationScope(Role.MANAGER, 'manager-123', 'other-mgr');
      expect(managerId).toBe('manager-123');
    });

    it('allows requested managerId when actor is COMPANY_ADMIN', () => {
      const managerId = authService.enforceManagerCreationScope(Role.COMPANY_ADMIN, 'admin-1', 'other-mgr');
      expect(managerId).toBe('other-mgr');
    });
  });

  describe('canRemoveUser (Manager Boundaries)', () => {
    const managerActor = { id: 'mgr-A', companyId: 'comp-1', employeeId: 'MGR001', role: Role.MANAGER };

    it('Manager CAN remove assigned employee (A1)', () => {
      const employeeA1 = {
        id: 'emp-A1',
        companyId: 'comp-1',
        employeeId: 'EMP001',
        name: 'Employee A1',
        role: EMP_ROLE,
        managerId: 'mgr-A',
      } as User;

      expect(authService.canRemoveUser(managerActor, employeeA1)).toBe(true);
    });

    it('Manager CANNOT remove employee belonging to another manager (B1)', () => {
      const employeeB1 = {
        id: 'emp-B1',
        companyId: 'comp-1',
        employeeId: 'EMP002',
        name: 'Employee B1',
        role: EMP_ROLE,
        managerId: 'mgr-B',
      } as User;

      expect(authService.canRemoveUser(managerActor, employeeB1)).toBe(false);
    });

    it('Manager CANNOT remove peer manager (Manager B)', () => {
      const managerB = {
        id: 'mgr-B',
        companyId: 'comp-1',
        employeeId: 'MGR002',
        name: 'Manager B',
        role: Role.MANAGER,
        managerId: null,
      } as User;

      expect(authService.canRemoveUser(managerActor, managerB)).toBe(false);
    });
  });
});
