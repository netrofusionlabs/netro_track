import { PrismaClient, Role, UserStatus, TimelineEventType, PolicyType, ModuleType } from '@prisma/client';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function flushAndSeed() {
  console.log('🧹 [1/3] Flushing all data from the database...');

  // Truncate all tables in cascade order
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
  `;

  for (const { tablename } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch (error) {
      console.warn(`Could not truncate table ${tablename}:`, error);
    }
  }

  console.log('✓ Database tables flushed successfully.');

  console.log('🌱 [2/3] Seeding NetroTrack platform company & modules...');

  // 1. Create NetroTrack Platform Company
  const netroCompany = await prisma.company.create({
    data: {
      name: 'NetroTrack',
      code: 'NETRO',
      isGpsEnabled: true,
    },
  });

  // 2. Enable All Modules for NetroTrack
  const modules: ModuleType[] = [
    ModuleType.ATTENDANCE,
    ModuleType.LEAVE,
    ModuleType.SHIFT,
    ModuleType.GPS,
    ModuleType.EXPENSE,
    ModuleType.REGULARIZATION,
    ModuleType.ASSET,
    ModuleType.PERFORMANCE,
  ];

  await prisma.companyModule.createMany({
    data: modules.map((mod) => ({
      companyId: netroCompany.id,
      module: mod,
      isEnabled: true,
    })),
  });

  // 3. Create Default HQ Branch
  const hqBranch = await prisma.branch.create({
    data: {
      id: '00000000-0000-4000-8000-000000000001',
      companyId: netroCompany.id,
      name: 'NetroTrack HQ',
      address: 'MG Road, Bengaluru, Karnataka, India',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });

  // 4. Create Designations
  const masterDesig = await prisma.designation.create({
    data: {
      companyId: netroCompany.id,
      name: 'Master System Administrator',
    },
  });

  const superAdminDesig = await prisma.designation.create({
    data: {
      companyId: netroCompany.id,
      name: 'Platform Lead & Super Admin',
    },
  });

  // 5. Create Default Attendance Policy
  const punchInConfig = {
    selfie: 'OPTIONAL',
    gps: 'REQUIRED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'OPTIONAL',
    signature: 'DISABLED',
    customFields: [],
  };

  const punchOutConfig = {
    selfie: 'OPTIONAL',
    gps: 'REQUIRED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'OPTIONAL',
    signature: 'DISABLED',
    customFields: [],
  };

  const regularizationConfig = {
    allowRegularization: true,
    allowMissedPunch: true,
    allowTimeCorrection: true,
    maxRequestsPerMonth: 5,
    regularizationWindowDays: 7,
  };

  const defaultPolicy = await prisma.attendancePolicy.create({
    data: {
      companyId: netroCompany.id,
      type: PolicyType.ATTENDANCE,
      name: 'NetroTrack Standard Attendance Policy',
      description: 'Default attendance and punch governance rules for NetroTrack platform',
      isActive: true,
      punchInConfig,
      punchOutConfig,
      regularizationConfig,
      config: {
        punchInConfig,
        punchOutConfig,
        regularizationConfig,
      },
    },
  });

  // Set as company default attendance policy
  await prisma.company.update({
    where: { id: netroCompany.id },
    data: { defaultAttendancePolicyId: defaultPolicy.id },
  });

  console.log('🌱 [3/3] Seeding NetroTrack Admin Accounts...');

  const passwordHash = await argon2.hash('Password123!');
  const mpinHash = await argon2.hash('9999');

  const usersToSeed = [
    {
      employeeId: 'NETRO-MASTER',
      name: 'Master System Admin',
      email: 'mastersuperadmin@netrotrack.in',
      role: Role.MASTER_SUPER_ADMIN,
      designationId: masterDesig.id,
      designationName: masterDesig.name,
      phone: '+91 9876543210',
    },
    {
      employeeId: 'NETRO-EMP001',
      name: 'Super Admin',
      email: 'superadmin@netrotrack.in',
      role: Role.SUPER_ADMIN,
      designationId: superAdminDesig.id,
      designationName: superAdminDesig.name,
      phone: '+91 8317513201',
    },
  ];

  for (const usr of usersToSeed) {
    const seededUser = await prisma.user.create({
      data: {
        employeeId: usr.employeeId,
        name: usr.name,
        email: usr.email,
        passwordHash,
        mpinHash,
        companyId: netroCompany.id,
        branchId: hqBranch.id,
        role: usr.role,
        designationId: usr.designationId,
        attendancePolicyId: defaultPolicy.id,
        status: UserStatus.ACTIVE,
        phone: usr.phone,
        emergencyContactName: 'NetroTrack Operations',
        emergencyContactPhone: '+91 8000000000',
      },
    });

    // Create Onboarding Timeline Events
    const effectiveDate = new Date();
    await prisma.userTimelineEvent.createMany({
      data: [
        {
          userId: seededUser.id,
          companyId: netroCompany.id,
          eventType: TimelineEventType.ONBOARDING,
          title: 'Onboarding',
          description: 'Employee onboarded to NetroTrack platform',
          newValue: 'Joined Organization',
          changedByName: 'System Initializer',
          effectiveDate,
        },
        {
          userId: seededUser.id,
          companyId: netroCompany.id,
          eventType: TimelineEventType.DESIGNATION_ASSIGNED,
          title: 'Designation Assigned',
          previousValue: null,
          newValue: usr.designationName,
          changedByName: 'System Initializer',
          effectiveDate,
        },
        {
          userId: seededUser.id,
          companyId: netroCompany.id,
          eventType: TimelineEventType.ACCESS_ROLE_ASSIGNED,
          title: 'Access Role Assigned',
          previousValue: null,
          newValue: ROLE_DISPLAY_LABELS[usr.role as unknown as UserRole] || usr.role,
          changedByName: 'System Initializer',
          effectiveDate,
        },
      ],
    });

    console.log(`✓ User created: ${seededUser.name} [${seededUser.employeeId}] (${seededUser.email})`);
  }

  console.log('\n======================================================');
  console.log('✅ DATABASE FLUSH & SEED COMPLETE');
  console.log('======================================================');
  console.log('🏢 Tenant Company:');
  console.log(`   • NetroTrack [NETRO] (ID: ${netroCompany.id})`);
  console.log('\n🔑 NetroTrack Login Accounts:');
  console.log('   1. Master System Admin:');
  console.log('      • Login ID : NETRO-MASTER  (or mastersuperadmin@netrotrack.in)');
  console.log('      • Password : Password123!');
  console.log('      • MPIN     : 9999');
  console.log('      • Role     : MASTER_SUPER_ADMIN');
  console.log('   2. Super Admin:');
  console.log('      • Login ID : NETRO-EMP001  (or superadmin@netrotrack.in)');
  console.log('      • Password : Password123!');
  console.log('      • MPIN     : 9999');
  console.log('      • Role     : SUPER_ADMIN');
  console.log('======================================================\n');
}

flushAndSeed()
  .catch((e) => {
    console.error('❌ Flush & Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
