/**
 * One-off backfill: provisions full entitlements + default access groups
 * for every existing tenant company that was onboarded before auto-provisioning
 * was added to the wizard flow.
 *
 * Safe to run multiple times (fully idempotent).
 *
 * Usage:
 *   cd apps/backend && npx ts-node prisma/backfill-company-provisioning.ts
 */
import { PrismaClient } from '@prisma/client';
import { provisionCompanyDefaults } from '../src/shared/services/company-provisioning.service';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${companies.length} company/companies to provision.\n`);

  for (const company of companies) {
    console.log(`⚙️  Provisioning [${company.code}] ${company.name}...`);
    await provisionCompanyDefaults(company.id);
    console.log(`✅  Done: ${company.name}\n`);
  }

  console.log('🎉 All companies provisioned successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
