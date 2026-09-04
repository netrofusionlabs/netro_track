import { CapabilityType, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import pino from 'pino';

const logger = pino({ name: 'company-provisioning' });

const EMPLOYEE_PATTERNS = [
  'attendance.punch.*',
  'attendance.history.view',
  'attendance.regularization.view',
  'attendance.regularization.create',
  'workforce.directory.view',
  'workforce.org_chart.view',
  'visits.records.*',
  'sales.orders.*',
  'inspections.audits.*',
  'customers.accounts.view',
  'customers.accounts.create',
  'products.catalogue.view',
  'reports.analytics.view',
];

const MANAGER_PATTERNS = [
  ...EMPLOYEE_PATTERNS,
  'attendance.team.view',
  'attendance.regularization.review',
  'tracking.live_map.view',
  'tracking.route_playback.view',
  'customers.accounts.edit',
];

const HR_PATTERNS = [
  ...MANAGER_PATTERNS,
  'attendance.team.company_view',
  'workforce.directory.create',
  'workforce.directory.edit',
  'workforce.directory.deactivate',
  'workforce.directory.reset_credentials',
  'workforce.org_chart.manage',
  'policies.attendance_policies.*',
  'organization.branches.*',
  'organization.departments.*',
  'organization.designations.*',
  'customers.accounts.delete',
  'reports.analytics.export',
];

/**
 * Provisions a newly onboarded tenant company with:
 *  1. Full capability entitlements (excluding platform-only `companies.*` module)
 *  2. Four default system access groups (Employee, Manager, HR Executive, Company Administrator)
 *  3. Auto-assignment of existing users into the correct group by their system role
 *
 * Idempotent — safe to call multiple times (uses upsert throughout).
 */
export async function provisionCompanyDefaults(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, code: true, name: true },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const isPlatformCompany = company.code === 'NETRO';

  // ── Step 1: Entitle all capabilities (excluding companies.* for non-platform tenants) ──
  const allCapabilities = await prisma.systemCapability.findMany({
    where: { isActive: true },
  });

  for (const cap of allCapabilities) {
    const isEntitled = isPlatformCompany || !cap.slug.startsWith('companies');
    await prisma.companyEntitlement.upsert({
      where: { companyId_capabilityId: { companyId, capabilityId: cap.id } },
      update: { isEnabled: isEntitled },
      create: { companyId, capabilityId: cap.id, isEnabled: isEntitled },
    });
  }

  logger.info({ companyId, company: company.name }, 'Entitlements provisioned');

  // ── Step 2: Build default access groups ──────────────────────────────────────
  const actionCaps = allCapabilities.filter((c) => c.type === CapabilityType.ACTION);

  const getCapIds = (patterns: string[]): string[] => {
    const ids: string[] = [];
    for (const cap of actionCaps) {
      if (!isPlatformCompany && cap.slug.startsWith('companies')) continue;
      const matched = patterns.some((p) =>
        p.endsWith('*')
          ? cap.slug.startsWith(p.slice(0, -1))
          : cap.slug === p
      );
      if (matched) ids.push(cap.id);
    }
    return ids;
  };

  const adminCapIds = actionCaps
    .filter((c) => isPlatformCompany || !c.slug.startsWith('companies'))
    .map((c) => c.id);

  const defaultGroups = [
    {
      name: 'Employee (Default)',
      description: 'Standard field & office employee permissions for daily operations',
      capIds: getCapIds(EMPLOYEE_PATTERNS),
      matchingRoles: [Role.EMPLOYEE],
    },
    {
      name: 'Manager (Default)',
      description: 'Team supervisor & manager permissions for approvals and team tracking',
      capIds: getCapIds(MANAGER_PATTERNS),
      matchingRoles: [Role.MANAGER],
    },
    {
      name: 'HR Executive (Default)',
      description: 'HR and operational administration permissions for workforce and policy management',
      capIds: getCapIds(HR_PATTERNS),
      matchingRoles: [Role.HR],
    },
    {
      name: 'Company Administrator (Default)',
      description: 'Full administrative control over tenant settings, access groups, and business modules',
      capIds: adminCapIds,
      matchingRoles: [Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN],
    },
  ];

  for (const grp of defaultGroups) {
    const accessGroup = await prisma.accessGroup.upsert({
      where: { companyId_name: { companyId, name: grp.name } },
      update: { description: grp.description, isSystem: true, isActive: true },
      create: { companyId, name: grp.name, description: grp.description, isSystem: true, isActive: true },
    });

    // Replace permissions wholesale
    await prisma.accessGroupPermission.deleteMany({ where: { accessGroupId: accessGroup.id } });
    if (grp.capIds.length > 0) {
      await prisma.accessGroupPermission.createMany({
        data: grp.capIds.map((cid) => ({ accessGroupId: accessGroup.id, capabilityId: cid })),
        skipDuplicates: true,
      });
    }

    // Auto-assign users with matching system roles
    const usersToAssign = await prisma.user.findMany({
      where: { companyId, role: { in: grp.matchingRoles }, deletedAt: null },
      select: { id: true },
    });

    for (const u of usersToAssign) {
      await prisma.userAccessGroup.upsert({
        where: { userId_accessGroupId: { userId: u.id, accessGroupId: accessGroup.id } },
        update: {},
        create: { userId: u.id, accessGroupId: accessGroup.id },
      });
    }
  }

  logger.info({ companyId, company: company.name }, 'Default access groups provisioned');
}
