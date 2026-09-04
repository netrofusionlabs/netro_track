import { Injectable, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { PermissionService } from './permission.service';
import { CAN, Role, hasRole } from '../models/roles';
import { IconName } from '../../ui/icon';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  roles: readonly Role[];
  /** Dynamic permission required to see this item (takes precedence over roles) */
  permission?: string;
  /** Dynamic module slug required to see this item */
  moduleSlug?: string;
  /** Shown in the command palette and as the nav tooltip when collapsed. */
  hint: string;
  /** Extra terms the command palette should match on. */
  keywords?: string[];
  /** Reads a live count (e.g. pending approvals) for the nav badge. */
  badge?: 'approvals';
  /** Disabled roadmap items yet to be released. */
  disabled?: boolean;
  badgeText?: string;
}

export interface NavGroup {
  /** Groups exist to chunk the list; they are not an extra level of nesting. */
  label: string;
  items: NavItem[];
}

/**
 * NetroTrack information architecture.
 *
 * Organised around the product's operating loop — people, presence, activity,
 * performance, outcome — rather than around database tables. Every destination
 * stays one click deep; groups are visual chunking only.
 */
const IA: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      {
        label: 'Dashboards',
        route: '/dashboard',
        icon: 'pulse',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'What is happening right now',
        keywords: ['dashboard', 'home', 'overview', 'today'],
      },
    ],
  },
  {
    label: 'Command',
    items: [
      {
        label: 'Live Operations',
        route: '/live',
        icon: 'radar',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
        moduleSlug: 'tracking',
        permission: 'tracking.live_map.view',
        hint: 'Field positions, movement and coverage',
        keywords: ['map', 'gps', 'tracking', 'location', 'fleet', 'route'],
      },
    ],
  },
  {
    label: 'Workforce',
    items: [
      {
        label: 'People',
        route: '/people',
        icon: 'people',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
        hint: 'Directory, roles, access and lifecycle',
        keywords: ['employees', 'staff', 'users', 'team', 'directory', 'headcount'],
      },
      {
        label: 'Organization Chart',
        route: '/organization',
        icon: 'hierarchy',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Reporting lines and management chains',
        keywords: ['org chart', 'hierarchy', 'reporting', 'structure', 'managers'],
      },
      {
        label: 'Attendance',
        route: '/attendance',
        icon: 'clock',
        moduleSlug: 'attendance',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Punch state, shift history and exceptions',
        keywords: ['punch', 'shift', 'clock in', 'timesheet', 'present', 'absent'],
      },
      {
        label: 'Visits',
        route: '/visits',
        icon: 'pin',
        moduleSlug: 'visits',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Customer calls, evidence and outcomes (Yet to release)',
        keywords: ['customer visit', 'check in', 'field call', 'meeting'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
    ],
  },
  {
    label: 'Onboarding',
    items: [
      {
        label: 'Company Onboarding',
        route: '/companies',
        icon: 'globe',
        roles: ['SUPER_ADMIN'],
        hint: 'Tenants, provisioning and module entitlements',
        keywords: ['tenants', 'organisations', 'provisioning', 'modules', 'onboarding'],
      },
      {
        label: 'Employee Onboarding',
        route: '/people',
        icon: 'people',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
        hint: 'Directory, roles, access and lifecycle',
        keywords: ['employees', 'staff', 'users', 'team', 'directory', 'headcount'],
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      {
        label: 'Policy Configuration',
        route: '/policies',
        icon: 'policy',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'],
        permission: 'custom_policy_management',
        hint: 'Attendance, leave, expense, tracking, visit and inspection governance rules',
        keywords: ['policy', 'attendance', 'leave', 'expense', 'tracking', 'gps', 'visit', 'inspection', 'rules', 'governance', 'assignment'],
      },
      {
        label: 'Branches Configuration',
        route: '/branches',
        icon: 'building',
        roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
        hint: 'Manage geographical or structural branch locations',
        keywords: ['locations', 'offices', 'hq', 'branches'],
      },
      {
        label: 'Department Setup',
        route: '/departments',
        icon: 'hierarchy',
        roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
        hint: 'Manage organizational departments and functional units',
        keywords: ['departments', 'units', 'teams'],
      },
      {
        label: 'Access Groups & Permissions',
        route: '/access-groups',
        icon: 'lock',
        permission: 'access_control.groups.view',
        roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'],
        hint: 'Configure tenant access profiles, roles, and granular capability assignments',
        keywords: ['access', 'groups', 'roles', 'permissions', 'authorization', 'capabilities', 'security'],
      },
      {
        label: 'Role Hierarchy',
        route: '/role-hierarchy',
        icon: 'hierarchy',
        roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
        hint: 'Configure company role ranks and approval authority levels',
        keywords: ['role hierarchy', 'ranking', 'ranks', 'approvals', 'authority', 'roles'],
      },
    ],
  },
  {
    label: 'Approvals',
    items: [
      {
        label: 'Approvals',
        route: '/approvals',
        icon: 'approve',
        moduleSlug: 'attendance',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
        hint: 'Regularization queue awaiting a decision',
        keywords: ['regularization', 'requests', 'pending', 'approve', 'reject', 'queue'],
        badge: 'approvals',
      },
    ],
  },
  {
    label: 'Field (Coming Soon)',
    items: [
      {
        label: 'Inspections',
        route: '/inspections',
        icon: 'inspect',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Site checks, observations and recommendations (Yet to release)',
        keywords: ['site check', 'audit', 'quality', 'observation'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
    ],
  },
  {
    label: 'Business (Coming Soon)',
    items: [
      {
        label: 'Customers',
        route: '/customers',
        icon: 'building',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Accounts, locations and relationship history (Yet to release)',
        keywords: ['clients', 'accounts', 'dealers', 'retailers', 'distributors'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
      {
        label: 'Products',
        route: '/products',
        icon: 'box',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Catalogue, pricing and availability (Yet to release)',
        keywords: ['catalogue', 'catalog', 'sku', 'pricing', 'inventory'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
      {
        label: 'Sales Orders',
        route: '/orders',
        icon: 'orders',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Orders booked in the field and revenue (Yet to release)',
        keywords: ['sales', 'revenue', 'orders', 'transactions', 'billing'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
    ],
  },
  {
    label: 'Intelligence (Coming Soon)',
    items: [
      {
        label: 'Reports',
        route: '/reports',
        icon: 'chart',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Attendance, visit and sales analysis with export (Yet to release)',
        keywords: ['analytics', 'export', 'csv', 'summary', 'trends', 'performance'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Access Groups',
        route: '/access-groups',
        icon: 'shield',
        roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN'],
        permission: 'access_control.groups.view',
        hint: 'Tenant access groups, role templates and user permission assignments',
        keywords: ['access', 'groups', 'roles', 'permissions', 'authorization', 'security'],
      },
      {
        label: 'Platform Capabilities',
        route: '/platform-capabilities',
        icon: 'layers',
        roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN'],
        hint: 'Manage platform modules, submodules and action registry',
        keywords: ['capabilities', 'modules', 'submodules', 'actions', 'registry', 'platform'],
      },
      {
        label: 'Companies',
        route: '/companies',
        icon: 'building',
        roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN'],
        hint: 'Tenant onboarding and organization directory',
        keywords: ['companies', 'tenants', 'organizations', 'clients'],
      },
      {
        label: 'Settings',
        route: '/settings',
        icon: 'settings',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Organization profile, appearance and security',
        keywords: ['preferences', 'appearance', 'theme', 'security', 'mpin', 'organisation'],
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly api = inject(ApiService);
  private readonly perms = inject(PermissionService);

  /** Nav groups filtered dynamically by effective permissions and tenant entitlement */
  readonly groups = computed<NavGroup[]>(() => {
    const role = this.api.role();
    if (!role) return [];
    return IA.map(group => ({
      label: group.label,
      items: group.items.filter(item => {
        if (item.permission) {
          return this.perms.has(item.permission);
        }
        if (item.moduleSlug) {
          return this.perms.hasModule(item.moduleSlug);
        }
        return hasRole(role, item.roles);
      }),
    })).filter(group => group.items.length > 0);
  });

  readonly items = computed<NavItem[]>(() => this.groups().flatMap(g => g.items));

  /** Where a role should land after sign-in. */
  landingRoute(role: Role | null): string {
    return role ? '/dashboard' : '/login';
  }

  canReview(): boolean {
    return this.perms.has('attendance.regularization.review') || hasRole(this.api.role(), CAN.reviewApprovals);
  }
}
