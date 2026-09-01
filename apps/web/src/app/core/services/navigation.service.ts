import { Injectable, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CAN, Role, hasRole } from '../models/roles';
import { IconName } from '../../ui/icon';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  roles: readonly Role[];
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
    label: 'Command',
    items: [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'pulse',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'What is happening right now',
        keywords: ['dashboard', 'home', 'overview', 'today'],
      },
      {
        label: 'Live Operations',
        route: '/live',
        icon: 'radar',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
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
        label: 'Organization',
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
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Punch state, shift history and exceptions',
        keywords: ['punch', 'shift', 'clock in', 'timesheet', 'present', 'absent'],
      },
      {
        label: 'Approvals',
        route: '/approvals',
        icon: 'approve',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'],
        hint: 'Regularization queue awaiting a decision',
        keywords: ['regularization', 'requests', 'pending', 'approve', 'reject', 'queue'],
        badge: 'approvals',
      },
      {
        label: 'Policies',
        route: '/policies',
        icon: 'policy',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'],
        hint: 'Attendance, leave, expense, tracking, visit and inspection governance rules',
        keywords: ['policy', 'attendance', 'leave', 'expense', 'tracking', 'gps', 'visit', 'inspection', 'rules', 'governance', 'assignment'],
      },
    ],
  },
  {
    label: 'Field (Coming Soon)',
    items: [
      {
        label: 'Visits',
        route: '/visits',
        icon: 'pin',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        hint: 'Customer calls, evidence and outcomes (Yet to release)',
        keywords: ['customer visit', 'check in', 'field call', 'meeting'],
        disabled: true,
        badgeText: 'Coming Soon',
      },
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
        label: 'Branches',
        route: '/branches',
        icon: 'building',
        roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
        hint: 'Manage geographical or structural branch locations',
        keywords: ['locations', 'offices', 'hq', 'branches'],
      },
      {
        label: 'Companies',
        route: '/companies',
        icon: 'globe',
        roles: ['SUPER_ADMIN'],
        hint: 'Tenants, provisioning and module entitlements',
        keywords: ['tenants', 'organisations', 'provisioning', 'modules', 'onboarding'],
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

  /** Nav groups filtered to what the signed-in role can actually reach. */
  readonly groups = computed<NavGroup[]>(() => {
    const role = this.api.role();
    if (!role) return [];
    return IA.map(group => ({
      label: group.label,
      items: group.items.filter(item => hasRole(role, item.roles)),
    })).filter(group => group.items.length > 0);
  });

  readonly items = computed<NavItem[]>(() => this.groups().flatMap(g => g.items));

  /** Where a role should land after sign-in. */
  landingRoute(role: Role | null): string {
    return role ? '/dashboard' : '/login';
  }

  canReview(): boolean {
    return hasRole(this.api.role(), CAN.reviewApprovals);
  }
}
