import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NetroTrack Multi-Tenant Database...');

  const passwordHash = await argon2.hash('Password123!');
  const mpinHash = await argon2.hash('1234');

  // ───────────────────────────────────────────────────────────────────────────
  // COMPANY 1: NetroFusion Technologies (Code: NETRO)
  // ───────────────────────────────────────────────────────────────────────────
  const company1 = await prisma.company.upsert({
    where: { code: 'NETRO' },
    update: { name: 'NetroFusion Technologies' },
    create: {
      name: 'NetroFusion Technologies',
      code: 'NETRO',
    },
  });
  console.log(`✓ Company seeded: ${company1.name} [NETRO]`);

  const branch1 = await prisma.branch.upsert({
    where: { id: '345e4567-e89b-12d3-a456-426614174001' },
    update: {},
    create: {
      id: '345e4567-e89b-12d3-a456-426614174001',
      companyId: company1.id,
      name: 'Bangalore HQ Branch',
      address: '100 Innovation Way, Indiranagar, Bangalore',
    },
  });

  const dept1 = await prisma.department.upsert({
    where: { id: '456e4567-e89b-12d3-a456-426614174001' },
    update: {},
    create: {
      id: '456e4567-e89b-12d3-a456-426614174001',
      companyId: company1.id,
      branchId: branch1.id,
      name: 'Field Operations & Sales',
    },
  });

  const desig1 = await prisma.designation.upsert({
    where: { id: '567e4567-e89b-12d3-a456-426614174001' },
    update: {},
    create: {
      id: '567e4567-e89b-12d3-a456-426614174001',
      companyId: company1.id,
      name: 'Senior Field Executive',
    },
  });

  // 1. SUPER_ADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@netro.com' },
    update: { passwordHash, mpinHash, companyId: company1.id },
    create: {
      companyId: company1.id,
      employeeId: 'SUPER001',
      name: 'System Super Admin',
      email: 'superadmin@netro.com',
      passwordHash,
      mpinHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`  └ User [SUPER_ADMIN]: ${superAdmin.name} (${superAdmin.email})`);

  // 2. COMPANY_ADMIN
  const companyAdmin1 = await prisma.user.upsert({
    where: { email: 'admin@netro.com' },
    update: { passwordHash, mpinHash, companyId: company1.id },
    create: {
      companyId: company1.id,
      employeeId: 'ADM001',
      name: 'Sarah Connor',
      email: 'admin@netro.com',
      passwordHash,
      mpinHash,
      role: Role.COMPANY_ADMIN,
      branchId: branch1.id,
      departmentId: dept1.id,
    },
  });
  console.log(`  └ User [COMPANY_ADMIN]: ${companyAdmin1.name} (${companyAdmin1.email})`);

  // 3. MANAGER
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager@netro.com' },
    update: { passwordHash, mpinHash, companyId: company1.id },
    create: {
      companyId: company1.id,
      employeeId: 'MGR001',
      name: 'Alex Vance',
      email: 'manager@netro.com',
      passwordHash,
      mpinHash,
      role: Role.MANAGER,
      branchId: branch1.id,
      departmentId: dept1.id,
    },
  });
  console.log(`  └ User [MANAGER]: ${manager1.name} (${manager1.email})`);

  // 4. FIELD_EMPLOYEE
  const employee1 = await prisma.user.upsert({
    where: { email: 'employee@netro.com' },
    update: { passwordHash, mpinHash, companyId: company1.id, managerId: manager1.id },
    create: {
      companyId: company1.id,
      employeeId: 'EMP001',
      name: 'John Doe',
      email: 'employee@netro.com',
      passwordHash,
      mpinHash,
      role: Role.FIELD_EMPLOYEE,
      managerId: manager1.id,
      branchId: branch1.id,
      departmentId: dept1.id,
      designationId: desig1.id,
    },
  });
  console.log(`  └ User [FIELD_EMPLOYEE]: ${employee1.name} (${employee1.email})`);

  // ───────────────────────────────────────────────────────────────────────────
  // COMPANY 2: Acme Field Systems (Code: ACME)
  // ───────────────────────────────────────────────────────────────────────────
  const company2 = await prisma.company.upsert({
    where: { code: 'ACME' },
    update: { name: 'Acme Field Systems' },
    create: {
      name: 'Acme Field Systems',
      code: 'ACME',
    },
  });
  console.log(`✓ Company seeded: ${company2.name} [ACME]`);

  const companyAdmin2 = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: { passwordHash, mpinHash, companyId: company2.id },
    create: {
      companyId: company2.id,
      employeeId: 'ADM002',
      name: 'Robert Ford',
      email: 'admin@acme.com',
      passwordHash,
      mpinHash,
      role: Role.COMPANY_ADMIN,
    },
  });
  console.log(`  └ User [COMPANY_ADMIN]: ${companyAdmin2.name} (${companyAdmin2.email})`);

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: { passwordHash, mpinHash, companyId: company2.id },
    create: {
      companyId: company2.id,
      employeeId: 'MGR002',
      name: 'Bernard Lowe',
      email: 'manager@acme.com',
      passwordHash,
      mpinHash,
      role: Role.MANAGER,
    },
  });
  console.log(`  └ User [MANAGER]: ${manager2.name} (${manager2.email})`);

  const employee2 = await prisma.user.upsert({
    where: { email: 'employee@acme.com' },
    update: { passwordHash, mpinHash, companyId: company2.id, managerId: manager2.id },
    create: {
      companyId: company2.id,
      employeeId: 'EMP002',
      name: 'Teddy Flood',
      email: 'employee@acme.com',
      passwordHash,
      mpinHash,
      role: Role.FIELD_EMPLOYEE,
      managerId: manager2.id,
    },
  });
  console.log(`  └ User [FIELD_EMPLOYEE]: ${employee2.name} (${employee2.email})`);

  // ───────────────────────────────────────────────────────────────────────────
  // COMPANY 3: AgriTech Global Services (Code: AGRI)
  // ───────────────────────────────────────────────────────────────────────────
  const company3 = await prisma.company.upsert({
    where: { code: 'AGRI' },
    update: { name: 'AgriTech Global Services' },
    create: {
      name: 'AgriTech Global Services',
      code: 'AGRI',
    },
  });
  console.log(`✓ Company seeded: ${company3.name} [AGRI]`);

  const companyAdmin3 = await prisma.user.upsert({
    where: { email: 'admin@agritech.com' },
    update: { passwordHash, mpinHash, companyId: company3.id },
    create: {
      companyId: company3.id,
      employeeId: 'ADM003',
      name: 'Marcus Wright',
      email: 'admin@agritech.com',
      passwordHash,
      mpinHash,
      role: Role.COMPANY_ADMIN,
    },
  });
  console.log(`  └ User [COMPANY_ADMIN]: ${companyAdmin3.name} (${companyAdmin3.email})`);

  const employee3 = await prisma.user.upsert({
    where: { email: 'employee@agritech.com' },
    update: { passwordHash, mpinHash, companyId: company3.id },
    create: {
      companyId: company3.id,
      employeeId: 'EMP003',
      name: 'David Miller',
      email: 'employee@agritech.com',
      passwordHash,
      mpinHash,
      role: Role.FIELD_EMPLOYEE,
    },
  });
  console.log(`  └ User [FIELD_EMPLOYEE]: ${employee3.name} (${employee3.email})`);

  console.log('\n✅ Multi-tenant database seed completed successfully!');
  console.log('\n🔑 Default Logins (Password: Password123! | MPIN: 1234):');
  console.log('  1. Super Admin    : superadmin@netro.com');
  console.log('  2. Netro Admin    : admin@netro.com        (NETRO-ADM001)');
  console.log('  3. Netro Manager  : manager@netro.com      (NETRO-MGR001)');
  console.log('  4. Netro Employee : employee@netro.com     (NETRO-EMP001)');
  console.log('  5. Acme Admin     : admin@acme.com         (ACME-ADM002)');
  console.log('  6. Acme Manager   : manager@acme.com       (ACME-MGR002)');
  console.log('  7. Acme Employee  : employee@acme.com      (ACME-EMP002)');
  console.log('  8. Agri Admin     : admin@agritech.com     (AGRI-ADM003)');
  console.log('  9. Agri Employee  : employee@agritech.com    (AGRI-EMP003)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
