import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { CAN } from './core/models/roles';

/**
 * NetroTrack routing.
 *
 * URLs follow the information architecture rather than the database: /people
 * rather than /employees, /orders rather than /sales, /approvals as a first
 * class destination rather than a tab buried inside attendance. The previous
 * URLs are kept as redirects so existing bookmarks and links keep working.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },

  {
    path: '',
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ---- Dashboard ----------------------------------------------------
      {
        path: 'dashboard',
        title: 'Dashboard · NetroTrack',
        loadComponent: () =>
          import('./features/command-center/command-center.component').then(m => m.CommandCenterComponent),
      },
      {
        path: 'live',
        title: 'Live Operations · NetroTrack',
        data: { roles: CAN.viewTeamOperations },
        loadComponent: () =>
          import('./features/live-operations/live-operations.component').then(m => m.LiveOperationsComponent),
      },

      // ---- Workforce ----------------------------------------------------
      {
        path: 'people',
        title: 'People · NetroTrack',
        data: { roles: CAN.manageWorkforce },
        loadComponent: () => import('./features/people/people.component').then(m => m.PeopleComponent),
      },
      {
        path: 'organization',
        title: 'Organization · NetroTrack',
        loadComponent: () =>
          import('./features/organization/organization.component').then(m => m.OrganizationComponent),
      },
      {
        path: 'attendance',
        title: 'Attendance · NetroTrack',
        loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent),
      },
      {
        path: 'approvals',
        title: 'Approvals · NetroTrack',
        data: { roles: CAN.reviewApprovals },
        loadComponent: () => import('./features/approvals/approvals.component').then(m => m.ApprovalsComponent),
      },
      {
        path: 'policies',
        title: 'Attendance Policies · NetroTrack',
        data: { roles: CAN.managePolicies },
        loadComponent: () =>
          import('./features/attendance-policies/attendance-policies.component').then(
            m => m.AttendancePoliciesComponent,
          ),
      },

      // ---- Field --------------------------------------------------------
      {
        path: 'visits',
        title: 'Visits · NetroTrack',
        loadComponent: () => import('./features/visits/visits.component').then(m => m.VisitsComponent),
      },
      {
        path: 'inspections',
        title: 'Inspections · NetroTrack',
        loadComponent: () => import('./features/inspections/inspections.component').then(m => m.InspectionsComponent),
      },

      // ---- Business -----------------------------------------------------
      {
        path: 'customers',
        title: 'Customers · NetroTrack',
        loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent),
      },
      {
        path: 'products',
        title: 'Products · NetroTrack',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'orders',
        title: 'Sales Orders · NetroTrack',
        loadComponent: () => import('./features/sales/sales.component').then(m => m.SalesComponent),
      },

      // ---- Intelligence -------------------------------------------------
      {
        path: 'reports',
        title: 'Reports · NetroTrack',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },

      // ---- Administration & account -------------------------------------
      {
        path: 'companies',
        title: 'Companies · NetroTrack',
        data: { roles: CAN.administerPlatform },
        loadComponent: () => import('./features/companies/companies.component').then(m => m.CompaniesComponent),
      },
      {
        path: 'settings',
        title: 'Settings · NetroTrack',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'profile',
        title: 'My Profile · NetroTrack',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },

      // ---- Legacy URLs ---------------------------------------------------
      { path: 'command', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'employees', redirectTo: 'people', pathMatch: 'full' },
      { path: 'org-chart', redirectTo: 'organization', pathMatch: 'full' },
      { path: 'attendance-policies', redirectTo: 'policies', pathMatch: 'full' },
      { path: 'sales', redirectTo: 'orders', pathMatch: 'full' },

      {
        path: '**',
        title: 'Page not found · NetroTrack',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
