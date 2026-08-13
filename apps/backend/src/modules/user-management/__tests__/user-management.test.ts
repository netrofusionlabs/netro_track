import { UserManagementService } from '../user-management.service';
import { AuthorizationService, JwtPayload } from '../../../shared/services/authorization.service';
import { Role, UserStatus } from '@prisma/client';
import { AppError } from '../../../shared/errors/AppError';
import { prisma } from '../../../shared/config/prisma';

jest.setTimeout(30000);

describe('User Management Integration & Authorization Tests', () => {
  let userMgmtService: UserManagementService;
  let authService: AuthorizationService;

  beforeAll(async () => {
    userMgmtService = new UserManagementService();
    authService = new AuthorizationService();

    // Ensure test companies exist
    const netro = await prisma.company.upsert({
      where: { code: 'NETRO' },
      update: {},
      create: { name: 'NetroTrack', code: 'NETRO' },
    });

    const acme = await prisma.company.upsert({
      where: { code: 'ACME' },
      update: {},
      create: { name: 'Acme Corp', code: 'ACME' },
    });

    // Ensure Master Super Admin exists
    await prisma.user.upsert({
      where: { email: 'master@netrotrack.com' },
      update: { role: Role.MASTER_SUPER_ADMIN },
      create: {
        employeeId: 'MASTER',
        name: 'Master Admin',
        email: 'master@netrotrack.com',
        passwordHash: 'dummy',
        role: Role.MASTER_SUPER_ADMIN,
        companyId: netro.id,
      },
    });

    // Ensure Super Admin exists
    await prisma.user.upsert({
      where: { email: 'superadmin@netrotrack.com' },
      update: { role: Role.SUPER_ADMIN },
      create: {
        employeeId: 'SUPER001',
        name: 'Test Super Admin',
        email: 'superadmin@netrotrack.com',
        passwordHash: 'dummy',
        role: Role.SUPER_ADMIN,
        companyId: netro.id,
      },
    });

    // Ensure Netro Company Admin exists
    await prisma.user.upsert({
      where: { email: 'admin@netrotrack.com' },
      update: { role: Role.COMPANY_ADMIN },
      create: {
        employeeId: 'ADM001',
        name: 'Test Netro Admin',
        email: 'admin@netrotrack.com',
        passwordHash: 'dummy',
        role: Role.COMPANY_ADMIN,
        companyId: netro.id,
      },
    });

    // Ensure Netro Manager exists
    const manager = await prisma.user.upsert({
      where: { email: 'manager@netrotrack.com' },
      update: { role: Role.MANAGER, status: UserStatus.ACTIVE },
      create: {
        employeeId: 'MGR001',
        name: 'Test Netro Manager',
        email: 'manager@netrotrack.com',
        passwordHash: 'dummy',
        role: Role.MANAGER,
        companyId: netro.id,
      },
    });

    // Ensure Acme Manager exists
    await prisma.user.upsert({
      where: { email: 'manager@acme.com' },
      update: { role: Role.MANAGER },
      create: {
        employeeId: 'MGR002',
        name: 'Test Acme Manager',
        email: 'manager@acme.com',
        passwordHash: 'dummy',
        role: Role.MANAGER,
        companyId: acme.id,
      },
    });

    const empRole = Role.EMPLOYEE;
    await prisma.user.upsert({
      where: { email: 'emp1@netrotrack.com' },
      update: { role: empRole, managerId: manager.id },
      create: {
        employeeId: 'EMP001',
        name: 'Test Employee',
        email: 'emp1@netrotrack.com',
        passwordHash: 'dummy',
        role: empRole,
        companyId: netro.id,
        managerId: manager.id,
      },
    });
  }, 30000);

  afterAll(async () => {
    try {
      // Clean up test users and test companies created for test run
      await prisma.user.deleteMany({
        where: {
          employeeId: { in: ['SUPER001', 'SUPER002', 'ADM001', 'MGR001', 'MGR002', 'EMP001'] },
        },
      });
      await prisma.company.deleteMany({
        where: { code: 'ACME' },
      });
    } catch (e) {
      // ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('Master Super Admin Protection Rules', () => {
    it('1. Master Super Admin cannot be deactivated or deleted', async () => {
      const msa = await prisma.user.findFirst({ where: { role: Role.MASTER_SUPER_ADMIN, deletedAt: null } });
      const sa = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN, deletedAt: null } });
      expect(msa).not.toBeNull();
      expect(sa).not.toBeNull();

      const actor: JwtPayload = {
        id: sa!.id,
        companyId: msa!.companyId,
        employeeId: sa!.employeeId,
        role: Role.SUPER_ADMIN,
      };

      await expect(userMgmtService.deactivateUser(actor, msa!.id)).rejects.toThrow(
        'Master Super Admin account cannot be deleted'
      );
    });

    it('2. Super Admin CANNOT create another Super Admin (Only Master can)', async () => {
      const sa = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN, deletedAt: null } });
      const saActor: JwtPayload = {
        id: sa!.id,
        companyId: sa!.companyId,
        employeeId: sa!.employeeId,
        role: Role.SUPER_ADMIN,
      };

      await expect(
        userMgmtService.createUser(saActor, {
          employeeId: 'SUPER002',
          name: 'Rogue Super Admin',
          email: 'rogue@netrotrack.com',
          phone: '+91 9876543210',
          emergencyContactName: 'John Doe',
          emergencyContactPhone: '+91 9123456789',
          role: Role.SUPER_ADMIN as any,
          designationName: 'Platform Engineer',
        })
      ).rejects.toThrow('Role SUPER_ADMIN is not authorized to create a SUPER_ADMIN user');
    });

    it('3. Master Super Admin CAN create a Super Admin', async () => {
      const msaActor: JwtPayload = {
        id: 'msa-1',
        companyId: 'comp-1',
        employeeId: 'MSA001',
        role: Role.MASTER_SUPER_ADMIN,
      };

      expect(authService.canCreateRole(msaActor.role, Role.SUPER_ADMIN)).toBe(true);
    });
  });

  describe('Company Admin Peer Authority & Scope Rules', () => {
    it('4. Company Admins have equal authority within their company (Role + Company scope)', async () => {
      const company = await prisma.company.findFirst({ where: { code: 'NETRO' } });
      expect(company).not.toBeNull();

      const adminA: JwtPayload = {
        id: 'admin-a-id',
        companyId: company!.id,
        employeeId: 'ADM001',
        role: Role.COMPANY_ADMIN,
      };

      const adminB: JwtPayload = {
        id: 'admin-b-id',
        companyId: company!.id,
        employeeId: 'ADM001B',
        role: Role.COMPANY_ADMIN,
      };

      const manager = await prisma.user.findFirst({
        where: { companyId: company!.id, role: Role.MANAGER, deletedAt: null },
      });
      expect(manager).not.toBeNull();

      // Admin B can remove Manager even if created by Admin A
      expect(authService.canRemoveUser(adminB, manager!)).toBe(true);
    });

    it('5. Company Admin CANNOT manage another company\'s Manager', async () => {
      const companyNetro = await prisma.company.findFirst({ where: { code: 'NETRO' } });
      const companyAcme = await prisma.company.findFirst({ where: { code: 'ACME' } });

      const netroAdmin: JwtPayload = {
        id: 'admin-netro',
        companyId: companyNetro!.id,
        employeeId: 'ADM001',
        role: Role.COMPANY_ADMIN,
      };

      const acmeManager = await prisma.user.findFirst({
        where: { companyId: companyAcme!.id, role: Role.MANAGER, deletedAt: null },
      });
      expect(acmeManager).not.toBeNull();

      expect(() => authService.assertCompanyScope(netroAdmin, acmeManager!.companyId)).toThrow(
        /Cross-tenant access forbidden|Access denied/
      );
    });
  });

  describe('Manager Rules & Creation Auto-Assignment', () => {
    it('6. Manager creating Employee has managerId forced to Manager\'s own id', () => {
      const managerActorId = 'mgr-123';
      const requestedManagerId = 'some-other-mgr';

      const finalManagerId = authService.enforceManagerCreationScope(
        Role.MANAGER,
        managerActorId,
        requestedManagerId
      );

      expect(finalManagerId).toBe(managerActorId);
    });

    it('7. Manager cannot manage another Manager', () => {
      const mgrA: JwtPayload = { id: 'mgr-A', companyId: 'comp-1', employeeId: 'MGR001', role: Role.MANAGER };
      const mgrB = { id: 'mgr-B', companyId: 'comp-1', employeeId: 'MGR002', role: Role.MANAGER, managerId: null } as any;

      expect(authService.canRemoveUser(mgrA, mgrB)).toBe(false);
      expect(authService.canManageUser(mgrA, mgrB)).toBe(false);
    });
  });

  describe('Atomic Manager Removal Workflow', () => {
    it('8. Atomic removal reassigns all subordinates to Unassigned without orphan records', async () => {
      const company = await prisma.company.findFirst({ where: { code: 'NETRO' } });
      expect(company).not.toBeNull();

      const adminUser = await prisma.user.findFirst({
        where: { companyId: company!.id, role: Role.COMPANY_ADMIN, deletedAt: null },
      });
      expect(adminUser).not.toBeNull();

      const adminActor: JwtPayload = {
        id: adminUser!.id,
        companyId: company!.id,
        employeeId: adminUser!.employeeId,
        role: Role.COMPANY_ADMIN,
      };

      let manager = await prisma.user.findFirst({
        where: { companyId: company!.id, role: Role.MANAGER, deletedAt: null },
      });
      expect(manager).not.toBeNull();

      // Ensure active for test
      if (manager!.status !== UserStatus.ACTIVE) {
        manager = await prisma.user.update({
          where: { id: manager!.id },
          data: { status: UserStatus.ACTIVE },
        });
      }

      const result = await userMgmtService.removeManager(adminActor, manager!.id, {
        strategy: 'move-to-unassigned',
      });

      expect(result.manager.status).toBe(UserStatus.INACTIVE);

      // Verify no subordinates left under deactivated manager
      const remainingSubs = await prisma.user.count({
        where: { managerId: manager!.id, deletedAt: null },
      });
      expect(remainingSubs).toBe(0);

      // Reactivate manager for clean test state
      await prisma.user.update({
        where: { id: manager!.id },
        data: { status: UserStatus.ACTIVE },
      });
    });

    it('9. Manager removal transaction rolls back on invalid replacement manager', async () => {
      const company = await prisma.company.findFirst({ where: { code: 'NETRO' } });
      const adminUser = await prisma.user.findFirst({
        where: { companyId: company!.id, role: Role.COMPANY_ADMIN, deletedAt: null },
      });
      const adminActor: JwtPayload = {
        id: adminUser!.id,
        companyId: company!.id,
        employeeId: adminUser!.employeeId,
        role: Role.COMPANY_ADMIN,
      };

      let manager = await prisma.user.findFirst({
        where: { companyId: company!.id, role: Role.MANAGER, deletedAt: null },
      });
      expect(manager).not.toBeNull();

      if (manager!.status !== UserStatus.ACTIVE) {
        manager = await prisma.user.update({
          where: { id: manager!.id },
          data: { status: UserStatus.ACTIVE },
        });
      }

      await expect(
        userMgmtService.removeManager(adminActor, manager!.id, {
          strategy: 'move-to-manager',
          targetManagerId: '00000000-0000-0000-0000-000000000000', // non-existent manager
        })
      ).rejects.toThrow();

      // Manager status should still be ACTIVE (rolled back)
      const checkMgr = await prisma.user.findUnique({ where: { id: manager!.id } });
      expect(checkMgr?.status).toBe(UserStatus.ACTIVE);
    });
  });
});
