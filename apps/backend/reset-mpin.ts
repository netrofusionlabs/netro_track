import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function resetMpin() {
  const mpinHash = await argon2.hash('1234');
  await prisma.user.updateMany({
    where: { employeeId: 'EMP001' },
    data: { mpinHash }
  });
  console.log('Successfully reset MPIN for EMP001 to 1234');
}

resetMpin().catch(console.error).finally(() => prisma.$disconnect());
