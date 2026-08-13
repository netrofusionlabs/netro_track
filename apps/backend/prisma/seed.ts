import { PrismaClient, Role, UserStatus, TimelineEventType } from '@prisma/client';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

export interface SeedConfig {
  companies: {
    name: string;
    code: string;
    isGpsEnabled?: boolean;
  }[];
  users: {
    employeeId: string;
    name: string;
    email: string;
    role: Role;
    companyCode: string;
    designationName: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }[];
}

/** Default Seed Configuration: 2 Companies, 3 Accounts */
export const DEFAULT_SEED_CONFIG: SeedConfig = {
  companies: [
    {
      name: 'NetroTrack',
      code: 'NETRO',
      isGpsEnabled: true,
    },
    {
      name: 'Infobell IT Solutions Pvt Ltd',
      code: 'IB',
      isGpsEnabled: true,
    },
  ],
  users: [
    {
      employeeId: 'NETRO-MASTER',
      name: 'Master System Admin',
      email: 'mastersuperadmin@netrotrack.in',
      role: Role.MASTER_SUPER_ADMIN,
      companyCode: 'NETRO',
      designationName: 'Master System Administrator',
      phone: '+91 9876543210',
    },
    {
      employeeId: 'NETRO-EMP001',
      name: 'Super Admin',
      email: 'superadmin@netrotrack.in',
      role: Role.SUPER_ADMIN,
      companyCode: 'NETRO',
      designationName: 'Platform Lead & Super Admin',
      phone: '+91 8317513201',
      emergencyContactName: 'Super Admin',
      emergencyContactPhone: '+91 8317513201',
    },
    {
      employeeId: 'IB-CA01',
      name: 'Company Admin',
      email: 'admin@infobellit.com',
      role: Role.COMPANY_ADMIN,
      companyCode: 'IB',
      designationName: 'HR & Administration Manager',
      phone: '+91 9786534265',
      emergencyContactName: 'Leela Krishna',
      emergencyContactPhone: '+91 9786534265',
    },
  ],
};

export async function seedDatabase(config: SeedConfig = DEFAULT_SEED_CONFIG) {
  console.log('🌱 Seeding NetroTrack Multi-Tenant Database...');

  const passwordHash = await argon2.hash('Password123!');
  const mpinHash = await argon2.hash('9999');

  const companyMap = new Map<string, string>();

  // 1. Seed Companies
  for (const comp of config.companies) {
    const seededCompany = await prisma.company.upsert({
      where: { code: comp.code },
      update: { name: comp.name, isGpsEnabled: comp.isGpsEnabled ?? true },
      create: {
        name: comp.name,
        code: comp.code,
        isGpsEnabled: comp.isGpsEnabled ?? true,
      },
    });
    companyMap.set(comp.code, seededCompany.id);

    // Seed default Headquarter Branch with GPS for geofence validation
    const hqBranch = await prisma.branch.upsert({
      where: { id: `00000000-0000-4000-8000-${comp.code === 'NETRO' ? '000000000001' : '000000000002'}` },
      update: { name: `${comp.name} HQ`, latitude: 12.9716, longitude: 77.5946 },
      create: {
        id: `00000000-0000-4000-8000-${comp.code === 'NETRO' ? '000000000001' : '000000000002'}`,
        companyId: seededCompany.id,
        name: `${comp.name} HQ`,
        address: 'MG Road, Bengaluru, Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    });

    console.log(`✓ Company seeded: ${seededCompany.name} [${seededCompany.code}] (HQ Branch: ${hqBranch.name})`);
  }

  // 2. Seed Users & Idempotent Timeline Events
  for (const usr of config.users) {
    const companyId = companyMap.get(usr.companyCode);
    if (!companyId) {
      throw new Error(`Company code '${usr.companyCode}' not found for user '${usr.employeeId}'`);
    }

    // Ensure designation exists
    let existingDesig = await prisma.designation.findFirst({
      where: { companyId, name: { equals: usr.designationName, mode: 'insensitive' } },
    });
    if (!existingDesig) {
      existingDesig = await prisma.designation.create({
        data: { companyId, name: usr.designationName },
      });
    }

    const hqBranchId = `00000000-0000-4000-8000-${usr.companyCode === 'NETRO' ? '000000000001' : '000000000002'}`;

    const seededUser = await prisma.user.upsert({
      where: { email: usr.email },
      update: {
        employeeId: usr.employeeId,
        name: usr.name,
        passwordHash,
        mpinHash,
        companyId,
        branchId: hqBranchId,
        role: usr.role,
        designationId: existingDesig.id,
        status: UserStatus.ACTIVE,
        phone: usr.phone || null,
        emergencyContactName: usr.emergencyContactName || null,
        emergencyContactPhone: usr.emergencyContactPhone || null,
      },
      create: {
        employeeId: usr.employeeId,
        name: usr.name,
        email: usr.email,
        passwordHash,
        mpinHash,
        companyId,
        branchId: hqBranchId,
        role: usr.role,
        designationId: existingDesig.id,
        status: UserStatus.ACTIVE,
        phone: usr.phone || null,
        emergencyContactName: usr.emergencyContactName || null,
        emergencyContactPhone: usr.emergencyContactPhone || null,
      },
    });
    console.log(`  └ User [${seededUser.role}]: ${seededUser.name} (${seededUser.employeeId} / ${seededUser.email})`);

    // Idempotently create onboarding timeline events if not already present
    const existingTimeline = await prisma.userTimelineEvent.findFirst({
      where: { userId: seededUser.id, eventType: TimelineEventType.ONBOARDING },
    });

    if (!existingTimeline) {
      const effectiveDate = new Date();
      await prisma.userTimelineEvent.createMany({
        data: [
          {
            userId: seededUser.id,
            companyId,
            eventType: TimelineEventType.ONBOARDING,
            title: 'Onboarding',
            description: 'Employee onboarded to platform',
            newValue: 'Joined Organization',
            changedByName: 'System Setup',
            effectiveDate,
          },
          {
            userId: seededUser.id,
            companyId,
            eventType: TimelineEventType.DESIGNATION_ASSIGNED,
            title: 'Designation Assigned',
            previousValue: null,
            newValue: usr.designationName,
            changedByName: 'System Setup',
            effectiveDate,
          },
          {
            userId: seededUser.id,
            companyId,
            eventType: TimelineEventType.ACCESS_ROLE_ASSIGNED,
            title: 'Access Role Assigned',
            previousValue: null,
            newValue: ROLE_DISPLAY_LABELS[usr.role as unknown as UserRole] || usr.role,
            changedByName: 'System Setup',
            effectiveDate,
          },
        ],
      });
      console.log(`    └ Timeline initialized for ${seededUser.employeeId}`);
    }
  }

  console.log('\n✅ Database seed completed successfully!');
  console.log('\n🔑 Quick Demo Accounts (Password: Password123! | MPIN: 9999):');
  console.log('  1. NetroTrack Master Super Admin : NETRO-MASTER (mastersuperadmin@netrotrack.in)');
  console.log('  2. NetroTrack Super Admin        : NETRO-EMP001 (superadmin@netrotrack.in)');
  console.log('  3. Infobell Company Admin        : IB-CA01      (admin@infobellit.com)');
}

async function main() {
  await seedDatabase(DEFAULT_SEED_CONFIG);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
