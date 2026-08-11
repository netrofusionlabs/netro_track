import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteIncompletePunch() {
  const user = await prisma.user.findFirst({ where: { employeeId: 'EMP001' } });
  if (!user) {
    console.error('User not found');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
  const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

  // Find incomplete punches for today
  const incompletePunches = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      punchOutTime: null,
      punchInTime: {
        gte: startOfDay,
        lte: endOfDay,
      }
    }
  });

  console.log(`Found ${incompletePunches.length} incomplete punches.`);
  
  for (const punch of incompletePunches) {
    console.log(`Deleting punch from ${punch.punchInTime.toISOString()}`);
    await prisma.attendance.delete({
      where: { id: punch.id }
    });
  }
}

deleteIncompletePunch().catch(console.error).finally(() => prisma.$disconnect());
