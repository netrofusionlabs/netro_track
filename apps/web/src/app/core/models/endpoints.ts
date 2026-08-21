/**
 * API paths, relative to `/api/v1`.
 *
 * Several routers are mounted under a name that does not match the resource
 * they serve — the workforce directory lives at `/user-management`, orders at
 * `/product-sales`, visits at `/customer-visits`. Naming them once here keeps
 * that mismatch in a single place instead of scattered through every feature.
 */
export const API = {
  /** Workforce directory, org chart, and user lifecycle actions. */
  workforce: '/user-management',
  workforceSupervisors: '/user-management/supervisors',
  workforceManagers: '/user-management/managers',
  workforceUnassigned: '/user-management/unassigned',
  orgRoots: '/user-management/org-chart/roots',
  orgSearch: '/user-management/org-chart/search',
  orgSubordinates: (managerId: string) => `/user-management/org-chart/subordinates/${managerId}`,
  person: (id: string) => `/user-management/${id}`,
  personTimeline: (id: string) => `/user-management/${id}/timeline`,
  personActivate: (id: string) => `/user-management/${id}/activate`,
  personDeactivate: (id: string) => `/user-management/${id}/deactivate`,
  personResetCredentials: (id: string) => `/user-management/${id}/reset-credentials`,
  personRemoveManager: (id: string) => `/user-management/${id}/remove-manager`,

  /** The signed-in user's own profile and auth helpers. */
  me: '/users/me',
  demoUsers: '/auth/demo-users',

  attendance: '/attendance',
  attendanceActive: '/attendance/active',
  attendanceToday: '/attendance/today',
  attendanceHistory: '/attendance/history',
  attendanceMonthly: '/attendance/monthly',
  attendanceSummary: '/attendance/summary',
  attendanceTeam: '/attendance/team',
  attendanceCompany: '/attendance/company',
  punchIn: '/attendance/punch-in',
  punchOut: '/attendance/punch-out',
  regularization: '/attendance/regularization',
  regularizationReview: (id: string) => `/attendance/regularization/${id}/review`,
  regularizationBulkReview: '/attendance/regularization/bulk-review',

  attendancePolicies: '/attendance-policies',
  attendancePolicyEffective: '/attendance-policies/effective',
  attendancePolicy: (id: string) => `/attendance-policies/${id}`,
  attendancePolicyDuplicate: (id: string) => `/attendance-policies/${id}/duplicate`,
  attendancePolicyAssignments: (id: string) => `/attendance-policies/${id}/assignments`,
  attendancePolicyAssign: '/attendance-policies/assign',

  policies: '/policies',
  policyEffective: '/policies/effective',
  policy: (id: string) => `/policies/${id}`,
  policyDuplicate: (id: string) => `/policies/${id}/duplicate`,
  policyAssignments: (id: string) => `/policies/${id}/assignments`,
  policyAssign: '/policies/assign',

  tracking: '/tracking/live',
  trackingRoute: '/tracking/route',

  visits: '/customer-visits',
  visitsToday: '/customer-visits/today',
  orders: '/product-sales',
  ordersToday: '/product-sales/today',
  inspections: '/inspections',
  inspectionsToday: '/inspections/today',

  customers: '/customers',
  products: '/products',
  companies: '/companies',
  company: (id: string) => `/companies/${id}`,

  dashboardSummary: '/dashboard/summary',
  dashboardTeamSummary: '/dashboard/team-summary',
  reports: '/reports',
  reportsAttendance: '/reports/attendance',
  reportsVisits: '/reports/visits',
  reportsSales: '/reports/sales',

  mpinSetup: '/auth/mpin/setup',
  profilePictureUploadUrl: '/users/me/profile-picture/upload-url',
  profilePictureComplete: '/users/me/profile-picture/complete',
  uploadsPresignedUrl: '/uploads/presigned-url',
  uploadsDeleteFile: '/uploads/file',
} as const;
