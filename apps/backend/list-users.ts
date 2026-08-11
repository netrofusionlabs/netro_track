import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function list() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => u.employeeId));
}

list().catch(console.error).finally(() => prisma.$disconnect());
