import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create a test company
  const companyId = '123e4567-e89b-12d3-a456-426614174000';
  const company = await prisma.company.upsert({
    where: { id: companyId },
    update: {
      code: 'Netro'
    },
    create: {
      id: companyId,
      name: 'NetroFusion Labs Test',
      code: 'Netro'
    }
  });
  console.log(`Created company: ${company.name} (${company.id})`);

  // 1.5 Create corporate hierarchy structures
  const branch = await prisma.branch.upsert({
    where: { id: '345e4567-e89b-12d3-a456-426614174000' },
    update: {},
    create: {
      id: '345e4567-e89b-12d3-a456-426614174000',
      companyId: company.id,
      name: 'HQ Office',
      address: '123 Main St, Bangalore'
    }
  });

  const department = await prisma.department.upsert({
    where: { id: '456e4567-e89b-12d3-a456-426614174000' },
    update: {},
    create: {
      id: '456e4567-e89b-12d3-a456-426614174000',
      companyId: company.id,
      branchId: branch.id,
      name: 'Field Operations'
    }
  });

  const designation = await prisma.designation.upsert({
    where: { id: '567e4567-e89b-12d3-a456-426614174000' },
    update: {},
    create: {
      id: '567e4567-e89b-12d3-a456-426614174000',
      companyId: company.id,
      name: 'Agri-Sales Agent'
    }
  });

  // 2. Create a test user (John Doe, FIELD_EMPLOYEE)
  const passwordHash = await argon2.hash('Password123!');
  const user = await prisma.user.upsert({
    where: {
      companyId_employeeId: {
        companyId: company.id,
        employeeId: 'EMP001'
      }
    },
    update: {
      passwordHash,
      email: 'employee@netro.com',
      branchId: branch.id,
      departmentId: department.id,
      designationId: designation.id
    },
    create: {
      companyId: company.id,
      employeeId: 'EMP001',
      name: 'John Doe',
      email: 'employee@netro.com',
      passwordHash,
      role: Role.FIELD_EMPLOYEE,
      branchId: branch.id,
      departmentId: department.id,
      designationId: designation.id
    }
  });
  console.log(`Created user: ${user.name} (${user.employeeId})`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
