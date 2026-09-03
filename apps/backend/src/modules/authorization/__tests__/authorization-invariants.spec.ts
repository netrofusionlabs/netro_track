import { PrismaClient, Role } from '@prisma/client';
import { PermissionService } from '../../../shared/services/permission.service';
import { AuthorizationService } from '../authorization.service';
import { AppError } from '../../../shared/errors/AppError';
import { closeRedis } from '../../../shared/config/redis';

const prisma = new PrismaClient();

jest.setTimeout(30000);

describe('Enterprise Dynamic Authorization Architecture Invariants', () => {
  let permissionService: PermissionService;
  let authorizationService: AuthorizationService;

  let testTenantAId: string;
  let testTenantBId: string;
  let testUserAId: string;
  let testUserBId: string;

  let punchCreateCap: { id: string; slug: string };
  let companyOnboardCap: { id: string; slug: string }; // Platform-only capability (not entitled to standard tenants)

  beforeAll(async () => {
    permissionService = PermissionService.getInstance();
    authorizationService = new AuthorizationService();

    // 1. Ensure isolated test capabilities exist for the invariant tests
    const parentAtt = await prisma.systemCapability.upsert({
      where: { slug: 'test.mock.attendance' },
      update: {},
      create: {
        name: 'Test Attendance',
        slug: 'test.mock.attendance',
        key: 'test_attendance',
        type: 'MODULE',
      },
    });

    const subPunch = await prisma.systemCapability.upsert({
      where: { slug: 'test.mock.attendance.punch' },
      update: { parentId: parentAtt.id },
      create: {
        name: 'Test Punch',
        slug: 'test.mock.attendance.punch',
        key: 'test_punch',
        type: 'FEATURE',
        parentId: parentAtt.id,
      },
    });

    const punchCap = await prisma.systemCapability.upsert({
      where: { slug: 'test.mock.attendance.punch.create' },
      update: { parentId: subPunch.id },
      create: {
        name: 'Test Punch In / Out',
        slug: 'test.mock.attendance.punch.create',
        key: 'test_create',
        type: 'ACTION',
        parentId: subPunch.id,
      },
    });
    punchCreateCap = { id: punchCap.id, slug: punchCap.slug };

    const onboardCap = await prisma.systemCapability.upsert({
      where: { slug: 'test.mock.companies.onboarding.manage' },
      update: {},
      create: {
        name: 'Test Company Onboarding',
        slug: 'test.mock.companies.onboarding.manage',
        key: 'test_manage',
        type: 'ACTION',
      },
    });
    companyOnboardCap = { id: onboardCap.id, slug: onboardCap.slug };

    // 2. Setup Test Tenant A
    const tenantA = await prisma.company.upsert({
      where: { code: 'TEST_TENANT_A' },
      update: {},
      create: {
        name: 'Test Tenant A',
        code: 'TEST_TENANT_A',
      },
    });
    testTenantAId = tenantA.id;

    // 3. Setup Test Tenant B
    const tenantB = await prisma.company.upsert({
      where: { code: 'TEST_TENANT_B' },
      update: {},
      create: {
        name: 'Test Tenant B',
        code: 'TEST_TENANT_B',
      },
    });
    testTenantBId = tenantB.id;

    // 4. Setup Test Users
    const userA = await prisma.user.upsert({
      where: {
        companyId_employeeId: {
          companyId: testTenantAId,
          employeeId: 'TEST-UA001',
        },
      },
      update: {},
      create: {
        companyId: testTenantAId,
        employeeId: 'TEST-UA001',
        name: 'Test User A',
        email: 'test_user_a@test.com',
        passwordHash: 'dummy_hash',
        role: Role.EMPLOYEE,
      },
    });
    testUserAId = userA.id;

    const userB = await prisma.user.upsert({
      where: {
        companyId_employeeId: {
          companyId: testTenantBId,
          employeeId: 'TEST-UB001',
        },
      },
      update: {},
      create: {
        companyId: testTenantBId,
        employeeId: 'TEST-UB001',
        name: 'Test User B',
        email: 'test_user_b@test.com',
        passwordHash: 'dummy_hash',
        role: Role.EMPLOYEE,
      },
    });
    testUserBId = userB.id;

    // Grant Tenant A entitlement to punchCreateCap, but explicitly NOT companyOnboardCap
    await prisma.companyEntitlement.upsert({
      where: {
        companyId_capabilityId: {
          companyId: testTenantAId,
          capabilityId: punchCreateCap.id,
        },
      },
      update: { isEnabled: true },
      create: {
        companyId: testTenantAId,
        capabilityId: punchCreateCap.id,
        isEnabled: true,
      },
    });

    await prisma.companyEntitlement.upsert({
      where: {
        companyId_capabilityId: {
          companyId: testTenantAId,
          capabilityId: companyOnboardCap.id,
        },
      },
      update: { isEnabled: false },
      create: {
        companyId: testTenantAId,
        capabilityId: companyOnboardCap.id,
        isEnabled: false,
      },
    });

    // Grant Tenant B entitlement to punchCreateCap
    await prisma.companyEntitlement.upsert({
      where: {
        companyId_capabilityId: {
          companyId: testTenantBId,
          capabilityId: punchCreateCap.id,
        },
      },
      update: { isEnabled: true },
      create: {
        companyId: testTenantBId,
        capabilityId: punchCreateCap.id,
        isEnabled: true,
      },
    });

    // Invalidate caches
    await permissionService.invalidateCompanyPermissions(testTenantAId);
    await permissionService.invalidateCompanyPermissions(testTenantBId);
  });

  afterAll(async () => {
    await closeRedis();
    await prisma.$disconnect();
  });

  describe('Invariant 1: Server-Side Ceiling Write Validation', () => {
    it('MUST reject Access Group creation containing non-entitled capabilities with 403 PERMISSION_NOT_ENTITLED', async () => {
      await expect(
        authorizationService.createAccessGroup(testTenantAId, testUserAId, {
          name: 'Illegal Platform Group',
          capabilityIds: [punchCreateCap.id, companyOnboardCap.id], // companyOnboardCap is NOT entitled to Tenant A
        })
      ).rejects.toMatchObject({
        code: 'PERMISSION_NOT_ENTITLED',
        statusCode: 403,
      });
    });

    it('MUST reject Direct User Permission assignment for non-entitled capabilities with 403 PERMISSION_NOT_ENTITLED', async () => {
      await expect(
        authorizationService.assignUserDirectPermissions(testTenantAId, testUserAId, testUserAId, {
          capabilityIds: [companyOnboardCap.id],
        })
      ).rejects.toMatchObject({
        code: 'PERMISSION_NOT_ENTITLED',
        statusCode: 403,
      });
    });

    it('MUST succeed when creating an Access Group with only entitled capabilities', async () => {
      const group = await authorizationService.createAccessGroup(testTenantAId, testUserAId, {
        name: 'Valid Field Group ' + Date.now(),
        capabilityIds: [punchCreateCap.id],
      });

      expect(group).toBeDefined();
      expect(group.permissions.some((p) => p.capabilityId === punchCreateCap.id)).toBe(true);
    });
  });

  describe('Invariant 2: Immediate Cascading Revocation', () => {
    it('MUST immediately deny effective access when Tenant Entitlement is revoked, even if Group/Direct permission exists', async () => {
      // 1. Assign User A direct permission for punchCreateCap while Tenant A is entitled
      await authorizationService.assignUserDirectPermissions(testTenantAId, testUserAId, testUserAId, {
        capabilityIds: [punchCreateCap.id],
      });

      // 2. Verify User A currently has effective access
      let hasAccess = await permissionService.hasPermissions(testUserAId, testTenantAId, [punchCreateCap.slug]);
      expect(hasAccess).toBe(true);

      // 3. Revoke Tenant A entitlement for punchCreateCap
      await authorizationService.updateTenantEntitlements(testTenantAId, testUserAId, {
        entitlements: [{ capabilityId: punchCreateCap.id, isEnabled: false }],
      });

      // 4. Verify User A immediately LOSES effective access (Effective Access ⊆ Tenant Entitlements)
      hasAccess = await permissionService.hasPermissions(testUserAId, testTenantAId, [punchCreateCap.slug]);
      expect(hasAccess).toBe(false);

      // 5. Restore Tenant A entitlement
      await authorizationService.updateTenantEntitlements(testTenantAId, testUserAId, {
        entitlements: [{ capabilityId: punchCreateCap.id, isEnabled: true }],
      });

      // 6. Verify access is restored
      hasAccess = await permissionService.hasPermissions(testUserAId, testTenantAId, [punchCreateCap.slug]);
      expect(hasAccess).toBe(true);
    });
  });

  describe('Invariant 3: Independent Groups and Direct Permissions', () => {
    it('Adding/modifying Direct Permissions does not modify Access Groups', async () => {
      // Create a test group
      const group = await authorizationService.createAccessGroup(testTenantAId, testUserAId, {
        name: 'Independent Group ' + Date.now(),
        capabilityIds: [punchCreateCap.id],
      });

      // Assign User A to this group
      await authorizationService.assignUserAccessGroups(testTenantAId, testUserAId, testUserAId, {
        accessGroupIds: [group.id],
      });

      // Assign an empty direct permission set to User A
      await authorizationService.assignUserDirectPermissions(testTenantAId, testUserAId, testUserAId, {
        capabilityIds: [],
      });

      // Fetch group from DB: group permissions must remain intact
      const fetchedGroup = await authorizationService.getAccessGroupById(testTenantAId, group.id);
      expect(fetchedGroup.permissions.length).toBe(1);
      expect(fetchedGroup.permissions[0].capabilityId).toBe(punchCreateCap.id);
    });
  });

  describe('Invariant 4: Multi-Tenant Isolation', () => {
    it('Tenant A cannot inspect or modify Tenant B users (IDOR prevention)', async () => {
      // Tenant A admin attempts to assign direct permissions to User B (from Tenant B)
      await expect(
        authorizationService.assignUserDirectPermissions(testTenantAId, testUserBId, testUserAId, {
          capabilityIds: [punchCreateCap.id],
        })
      ).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('Tenant A cannot access Tenant B access groups', async () => {
      const groupB = await authorizationService.createAccessGroup(testTenantBId, testUserBId, {
        name: 'Tenant B Group ' + Date.now(),
        capabilityIds: [punchCreateCap.id],
      });

      // Tenant A attempts to read Tenant B group
      await expect(
        authorizationService.getAccessGroupById(testTenantAId, groupB.id)
      ).rejects.toMatchObject({
        code: 'ACCESS_GROUP_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('Debug Provenance Inspector', () => {
    it('Generates full provenance showing whether capabilities are granted via GROUP, DIRECT, and whether entitled', async () => {
      const profile = await authorizationService.getUserAccessProfile(testTenantAId, testUserAId);

      expect(profile.userId).toBe(testUserAId);
      expect(profile.companyId).toBe(testTenantAId);
      expect(profile.provenance).toBeDefined();

      const punchProv = profile.provenance[punchCreateCap.slug];
      expect(punchProv).toBeDefined();
      expect(punchProv.entitled).toBe(true);
      expect(punchProv.effective).toBe(true);
      expect(punchProv.grantedVia.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Clean up test data and test capabilities
    await prisma.userDirectPermission.deleteMany({
      where: { user: { companyId: { in: [testTenantAId, testTenantBId] } } },
    });
    await prisma.userAccessGroup.deleteMany({
      where: { user: { companyId: { in: [testTenantAId, testTenantBId] } } },
    });
    await prisma.accessGroupPermission.deleteMany({
      where: { accessGroup: { companyId: { in: [testTenantAId, testTenantBId] } } },
    });
    await prisma.accessGroup.deleteMany({
      where: { companyId: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.companyEntitlement.deleteMany({
      where: {
        OR: [
          { companyId: { in: [testTenantAId, testTenantBId] } },
          { capability: { slug: { startsWith: 'test.mock.' } } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { companyId: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.systemCapability.deleteMany({
      where: { slug: { startsWith: 'test.mock.' } },
    });
    await closeRedis();
    await prisma.$disconnect();
  });
});
