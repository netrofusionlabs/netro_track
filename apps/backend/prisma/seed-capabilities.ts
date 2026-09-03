import { PrismaClient, CapabilityType, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface CapabilityNode {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  type: CapabilityType;
  children?: CapabilityNode[];
}

export const SYSTEM_CAPABILITY_TREE: CapabilityNode[] = [
  {
    key: 'attendance',
    name: 'Attendance Management',
    description: 'Digitize employee attendance, shifts, punch-in/out, and regularization',
    icon: 'clock',
    sortOrder: 10,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'punch',
        name: 'Punch In / Out',
        description: 'Record daily attendance punch timestamps and GPS coordinates',
        icon: 'clock',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Punch Status', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Punch In / Out', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'history',
        name: 'Attendance History',
        description: 'View historical monthly and daily attendance logs',
        icon: 'calendar',
        sortOrder: 2,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View History', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'export', name: 'Export History', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'team',
        name: 'Team & Company Attendance',
        description: 'Monitor subordinates and organization-wide attendance records',
        icon: 'people',
        sortOrder: 3,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Team Attendance', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'company_view', name: 'View Company Attendance', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'regularization',
        name: 'Attendance Regularization',
        description: 'Submit and approve attendance exception regularization requests',
        icon: 'approve',
        sortOrder: 4,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Regularization Requests', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Apply for Regularization', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'review', name: 'Approve / Reject Regularizations', sortOrder: 3, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'workforce',
    name: 'Workforce Directory & Management',
    description: 'Manage employee profiles, designations, managers, and organizational charts',
    icon: 'people',
    sortOrder: 20,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'directory',
        name: 'Employee Directory',
        description: 'Employee listings, profile management, and account administration',
        icon: 'people',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Employee Directory', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Add New Employees', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Employee Details', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'deactivate', name: 'Deactivate / Reactivate Users', sortOrder: 4, type: CapabilityType.ACTION },
          { key: 'reset_credentials', name: 'Reset Password & MPIN', sortOrder: 5, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'org_chart',
        name: 'Organization Chart',
        description: 'Visual reporting hierarchy and management chain setup',
        icon: 'hierarchy',
        sortOrder: 2,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Organization Hierarchy', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Restructure Hierarchy & Managers', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'tracking',
    name: 'Live GPS Tracking & Movement',
    description: 'Real-time field location visibility, movement breadcrumbs, and route replays',
    icon: 'radar',
    sortOrder: 30,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'live_map',
        name: 'Live Team Map',
        description: 'Real-time location markers of active field workforce',
        icon: 'radar',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Live Field Map', sortOrder: 1, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'route_playback',
        name: 'Route Playback',
        description: 'Historical path replays with stop duration and speed analytics',
        icon: 'map',
        sortOrder: 2,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Route Playback', sortOrder: 1, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'visits',
    name: 'Customer Visits & Field Engagement',
    description: 'Verify field client meetings, capture site photos, and record outcomes',
    icon: 'pin',
    sortOrder: 40,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'records',
        name: 'Visit Logs',
        description: 'Client visit verification, check-in, and note logging',
        icon: 'pin',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Visits', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Log New Visit', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Visit Records', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'delete', name: 'Delete Visit Records', sortOrder: 4, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'sales',
    name: 'Sales Orders & Field Commerce',
    description: 'Field order booking, product selections, invoice generation, and order tracking',
    icon: 'orders',
    sortOrder: 50,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'orders',
        name: 'Sales Orders',
        description: 'Book and manage sales orders from client visits',
        icon: 'orders',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Sales Orders', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Book New Sales Order', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Sales Orders', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'delete', name: 'Delete Sales Orders', sortOrder: 4, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'inspections',
    name: 'Site Audits & Field Inspections',
    description: 'Standardized checklist execution, observation notes, and compliance audits',
    icon: 'inspect',
    sortOrder: 60,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'audits',
        name: 'Inspection Audits',
        description: 'Perform structured site inspections and quality checks',
        icon: 'inspect',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Inspections', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Submit Site Inspection', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Inspection Report', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'delete', name: 'Delete Inspection Records', sortOrder: 4, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'customers',
    name: 'Client & Dealer Directory',
    description: 'Manage customer accounts, geo-tagged locations, and contact rosters',
    icon: 'building',
    sortOrder: 70,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'accounts',
        name: 'Customer Accounts',
        description: 'Customer profiles, contact persons, and address locations',
        icon: 'building',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Customers', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Create Customer Account', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Customer Details', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'delete', name: 'Delete Customer Account', sortOrder: 4, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'products',
    name: 'Product Catalogue & Inventory',
    description: 'Item masters, SKU codes, pricing, units of measurement, and categories',
    icon: 'box',
    sortOrder: 80,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'catalogue',
        name: 'Product Catalogue',
        description: 'Product definitions, variants, and pricing structures',
        icon: 'box',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Product Catalogue', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'create', name: 'Add Product Item', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'edit', name: 'Edit Product Details', sortOrder: 3, type: CapabilityType.ACTION },
          { key: 'delete', name: 'Remove Product Item', sortOrder: 4, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'policies',
    name: 'Governance & Policy Configuration',
    description: 'Attendance shifts, grace periods, geo-fences, regularization limits, and policy assignments',
    icon: 'policy',
    sortOrder: 90,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'attendance_policies',
        name: 'Attendance Policies',
        description: 'Define punch-in rules, geo-fencing, and shift schedules',
        icon: 'policy',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Policies', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Create, Edit & Duplicate Policies', sortOrder: 2, type: CapabilityType.ACTION },
          { key: 'assign', name: 'Assign Policies to Targets', sortOrder: 3, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'organization',
    name: 'Organization Structure',
    description: 'Manage structural entities: branches, functional departments, and designations',
    icon: 'hierarchy',
    sortOrder: 100,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'branches',
        name: 'Branch Locations',
        description: 'Geographic and structural office branch locations',
        icon: 'building',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Branches', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Create, Edit & Delete Branches', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'departments',
        name: 'Departments',
        description: 'Functional organizational divisions and departments',
        icon: 'hierarchy',
        sortOrder: 2,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Departments', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Create, Edit & Delete Departments', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'designations',
        name: 'Designations',
        description: 'Job titles and role designations',
        icon: 'badge',
        sortOrder: 3,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Designations', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Create, Edit & Delete Designations', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'access_control',
    name: 'Access Control & Permissions',
    description: 'Configure tenant access groups, user assignments, and inspect effective permissions',
    icon: 'lock',
    sortOrder: 110,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'groups',
        name: 'Access Groups',
        description: 'Define reusable group permission profiles within tenant entitlement boundary',
        icon: 'lock',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Access Groups', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Create, Edit & Delete Access Groups', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
      {
        key: 'user_permissions',
        name: 'User Permissions',
        description: 'Assign groups, grant direct permissions, and inspect effective access provenance',
        icon: 'people',
        sortOrder: 2,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'Inspect User Effective Permissions', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'assign', name: 'Assign Groups & Direct Permissions', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'reports',
    name: 'Reports & Intelligence',
    description: 'Generate workforce attendance, visit, and sales reports with data exports',
    icon: 'chart',
    sortOrder: 120,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'analytics',
        name: 'Analytics Reports',
        description: 'Aggregated workforce metrics and CSV data exports',
        icon: 'chart',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Reports', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'export', name: 'Export Report Data', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
  {
    key: 'companies',
    name: 'Tenant Company Provisioning',
    description: 'Platform super-admin capability to onboard tenants and manage module entitlements',
    icon: 'globe',
    sortOrder: 130,
    type: CapabilityType.MODULE,
    children: [
      {
        key: 'onboarding',
        name: 'Company Onboarding',
        description: 'Create tenant companies and manage tenant entitlement boundaries',
        icon: 'globe',
        sortOrder: 1,
        type: CapabilityType.FEATURE,
        children: [
          { key: 'view', name: 'View Companies', sortOrder: 1, type: CapabilityType.ACTION },
          { key: 'manage', name: 'Manage Companies & Entitlements', sortOrder: 2, type: CapabilityType.ACTION },
        ],
      },
    ],
  },
];

async function seedCapabilityNode(node: CapabilityNode, parentId: string | null = null, parentSlug: string = ''): Promise<void> {
  const currentSlug = parentSlug ? `${parentSlug}.${node.key}` : node.key;

  const capability = await prisma.systemCapability.upsert({
    where: { slug: currentSlug },
    update: {
      name: node.name,
      description: node.description,
      icon: node.icon,
      sortOrder: node.sortOrder,
      type: node.type,
      parentId,
      isActive: true,
    },
    create: {
      key: node.key,
      slug: currentSlug,
      name: node.name,
      description: node.description,
      icon: node.icon,
      sortOrder: node.sortOrder,
      type: node.type,
      parentId,
      isActive: true,
    },
  });

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await seedCapabilityNode(child, capability.id, currentSlug);
    }
  }
}

export async function seedCapabilitiesAndEntitlements() {
  console.log('🌱 [1/4] Seeding Platform Capabilities...');
  for (const moduleNode of SYSTEM_CAPABILITY_TREE) {
    await seedCapabilityNode(moduleNode, null, '');
  }

  // Fetch all capabilities for assignment
  const allCapabilities = await prisma.systemCapability.findMany();
  const capabilityMapBySlug = new Map<string, string>();
  for (const c of allCapabilities) {
    capabilityMapBySlug.set(c.slug, c.id);
  }

  // All action-level capabilities
  const actionCapabilities = allCapabilities.filter((c) => c.type === CapabilityType.ACTION);

  console.log('🌱 [2/4] Seeding Tenant Entitlements...');
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    const isPlatformCompany = company.code === 'NETRO';

    for (const cap of allCapabilities) {
      // Platform company gets everything; tenant companies get all modules except platform 'companies'
      const isEntitled = isPlatformCompany || !cap.slug.startsWith('companies');

      await prisma.companyEntitlement.upsert({
        where: {
          companyId_capabilityId: {
            companyId: company.id,
            capabilityId: cap.id,
          },
        },
        update: {
          isEnabled: isEntitled,
        },
        create: {
          companyId: company.id,
          capabilityId: cap.id,
          isEnabled: isEntitled,
        },
      });
    }

    console.log(`🌱 [3/4] Seeding Default Access Groups for Company ${company.name} (${company.code})...`);

    // Helper to get capability IDs by slugs (including prefix wildcards)
    const getCapIdsByPatterns = (patterns: string[]): string[] => {
      const ids: string[] = [];
      for (const cap of actionCapabilities) {
        if (!isPlatformCompany && cap.slug.startsWith('companies')) continue;
        const matches = patterns.some((p) => {
          if (p.endsWith('*')) {
            const prefix = p.slice(0, -1);
            return cap.slug.startsWith(prefix);
          }
          return cap.slug === p;
        });
        if (matches) ids.push(cap.id);
      }
      return ids;
    };

    // 1. Employee Group
    const employeePatterns = [
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

    // 2. Manager Group (Employee + Team oversight + Approvals)
    const managerPatterns = [
      ...employeePatterns,
      'attendance.team.view',
      'attendance.regularization.review',
      'tracking.live_map.view',
      'tracking.route_playback.view',
      'customers.accounts.edit',
    ];

    // 3. HR Executive Group (Manager + Workforce Administration + Policies + Org Structure)
    const hrPatterns = [
      ...managerPatterns,
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

    // 4. Company Administrator Group (All capabilities entitled to company)
    const adminCapIds = actionCapabilities
      .filter((c) => isPlatformCompany || !c.slug.startsWith('companies'))
      .map((c) => c.id);

    const defaultGroups = [
      {
        name: 'Employee (Default)',
        description: 'Standard field & office employee permissions for daily operations',
        isSystem: true,
        capIds: getCapIdsByPatterns(employeePatterns),
        matchingRoles: [Role.EMPLOYEE],
      },
      {
        name: 'Manager (Default)',
        description: 'Team supervisor & manager permissions for approvals and team tracking',
        isSystem: true,
        capIds: getCapIdsByPatterns(managerPatterns),
        matchingRoles: [Role.MANAGER],
      },
      {
        name: 'HR Executive (Default)',
        description: 'HR and operational administration permissions for workforce and policy management',
        isSystem: true,
        capIds: getCapIdsByPatterns(hrPatterns),
        matchingRoles: [Role.HR],
      },
      {
        name: 'Company Administrator (Default)',
        description: 'Full administrative control over tenant settings, access groups, and business modules',
        isSystem: true,
        capIds: adminCapIds,
        matchingRoles: [Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN],
      },
    ];

    for (const grp of defaultGroups) {
      const accessGroup = await prisma.accessGroup.upsert({
        where: {
          companyId_name: {
            companyId: company.id,
            name: grp.name,
          },
        },
        update: {
          description: grp.description,
          isSystem: true,
          isActive: true,
        },
        create: {
          companyId: company.id,
          name: grp.name,
          description: grp.description,
          isSystem: true,
          isActive: true,
        },
      });

      // Clear & set group permissions
      await prisma.accessGroupPermission.deleteMany({
        where: { accessGroupId: accessGroup.id },
      });

      if (grp.capIds.length > 0) {
        await prisma.accessGroupPermission.createMany({
          data: grp.capIds.map((cid) => ({
            accessGroupId: accessGroup.id,
            capabilityId: cid,
          })),
          skipDuplicates: true,
        });
      }

      // Assign existing users of matching roles in this company
      const usersToAssign = await prisma.user.findMany({
        where: {
          companyId: company.id,
          role: { in: grp.matchingRoles },
        },
      });

      for (const u of usersToAssign) {
        await prisma.userAccessGroup.upsert({
          where: {
            userId_accessGroupId: {
              userId: u.id,
              accessGroupId: accessGroup.id,
            },
          },
          update: {},
          create: {
            userId: u.id,
            accessGroupId: accessGroup.id,
          },
        });
      }
    }
  }

  console.log('✅ [4/4] Dynamic Authorization System Seeding Completed Successfully!');
}

if (require.main === module) {
  seedCapabilitiesAndEntitlements()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
