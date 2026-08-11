import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function testMpin() {
  const user = await prisma.user.findFirst({ where: { employeeId: 'EMP001' } });
  if (!user) return console.log('User not found');
  
  console.log('mpinHash:', user.mpinHash);
  if (user.passwordHash) {
    const isValid = await argon2.verify(user.passwordHash, 'Password123!');
    console.log('Is Password123! valid?', isValid);
  }
}

testMpin().catch(console.error).finally(() => prisma.$disconnect());
