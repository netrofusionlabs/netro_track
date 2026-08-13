import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Clean NetroTrack Workspace with Master Super Admin...');

  const passwordHash = await argon2.hash('Password123!');
  const mpinHash = await argon2.hash('9999');

  // 1. Initial Master Company: NetroTrack
  const company = await prisma.company.upsert({
    where: { code: 'NETRO' },
    update: { name: 'NetroTrack', isGpsEnabled: true },
    create: {
      name: 'NetroTrack',
      code: 'NETRO',
      isGpsEnabled: true,
    },
  });
  console.log(`✓ Master Company created: ${company.name} [${company.code}]`);

  // 2. NetroTrack Master Super Admin
  const masterAdmin = await prisma.user.upsert({
    where: { email: 'master@netrotrack.com' },
    update: {
      employeeId: 'MASTER',
      name: 'NetroTrack Master Super Admin',
      passwordHash,
      mpinHash,
      companyId: company.id,
      role: Role.MASTER_SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isGpsTracked: true,
    },
    create: {
      employeeId: 'MASTER',
      name: 'NetroTrack Master Super Admin',
      email: 'master@netrotrack.com',
      passwordHash,
      mpinHash,
      companyId: company.id,
      role: Role.MASTER_SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isGpsTracked: true,
    },
  });

  console.log(`✓ Master Super Admin created: ${masterAdmin.name} (${masterAdmin.employeeId} / ${masterAdmin.email})`);
  console.log('----------------------------------------------------');
  console.log('Login Credentials:');
  console.log(`Employee ID: ${masterAdmin.employeeId}`);
  console.log(`Email:       ${masterAdmin.email}`);
  console.log('Password:    Password123!');
  console.log('MPIN:        9999');
  console.log('Role:        MASTER_SUPER_ADMIN');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
