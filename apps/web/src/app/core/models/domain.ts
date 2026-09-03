/**
 * Shapes returned by the NetroTrack API, as consumed by the web portal.
 *
 * These mirror the Prisma models and the shapes the services actually project;
 * fields the API may omit are optional rather than assumed, so a partial
 * payload degrades to a dash in the UI instead of throwing.
 */

import { Role } from './roles';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;

export interface Person {
  id: string;
  companyId?: string;
  employeeId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  status?: UserStatus;
  profilePictureUrl?: string | null;
  designationName?: string | null;
  designation?: { id: string; name: string } | null;
  departmentName?: string | null;
  department?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  managerId?: string | null;
  managerName?: string | null;
  manager?: { id: string; name: string; employeeId?: string | null } | null;
  company?: { id: string; name: string; code?: string | null } | null;
  isGpsTracked?: boolean;
  attendancePolicyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;

  /* Personal details — only present on the detail/list projections. */
  personalEmail?: string | null;
  secondaryPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  bloodGroup?: string | null;

  accessGroups?: Array<{
    accessGroupId: string;
    accessGroup?: {
      id: string;
      name: string;
      description?: string | null;
      isSystem?: boolean;
    };
  }>;

  /** Prisma's relation count, as returned by the list and detail endpoints. */
  _count?: { subordinates?: number } | null;
  subordinateCount?: number;
}

/** Direct reports, wherever the API happened to put the number. */
export function directReports(person: Person): number {
  return person.subordinateCount ?? person._count?.subordinates ?? 0;
}

/**
 * A node in the organisation chart. The `/users/org-chart/*` endpoints project
 * a flatter shape than `/users`, with its own `subordinatesCount` spelling.
 */
export interface OrgNode {
  id: string;
  employeeId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  roleLabel?: string;
  status?: UserStatus;
  designationName?: string | null;
  departmentName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  subordinatesCount: number;
}

/** A recorded change to someone's role, reporting line or designation. */
export interface PersonTimelineEvent {
  id: string;
  userId: string;
  eventType: string;
  title?: string | null;
  description?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  changedByName?: string | null;
  effectiveDate?: string | null;
  createdAt: string;
}

/** A single punch session. `punchOutTime === null` means the shift is open. */
export interface AttendanceRecord {
  id: string;
  companyId?: string;
  userId: string;
  user?: Pick<Person, 'id' | 'name' | 'employeeId' | 'role' | 'profilePictureUrl' | 'designationName'>;
  punchInTime: string;
  punchOutTime?: string | null;
  punchInLatitude?: number | null;
  punchInLongitude?: number | null;
  punchOutLatitude?: number | null;
  punchOutLongitude?: number | null;
  workingHours?: number | string | null;
  punchInEvidence?: Record<string, unknown> | null;
  punchOutEvidence?: Record<string, unknown> | null;
  policySnapshot?: PunchPolicySnapshot | null;
  geofenceDistance?: number | null;
  isGeofenceValid?: boolean | null;
}

/* ---- Attendance policy ---------------------------------------------------
   Mirrors `packages/shared/src/schemas/attendance-policy.validator.ts`. The
   policy decides what a punch must carry, so both the punch console and the
   policy editor read the same shapes. --------------------------------------- */

export type PunchComponentStatus = 'DISABLED' | 'OPTIONAL' | 'REQUIRED';

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER';
  status: PunchComponentStatus;
}

export interface PunchConfig {
  selfie: PunchComponentStatus;
  gps: PunchComponentStatus;
  vehicleMeter: PunchComponentStatus;
  vehiclePhoto: PunchComponentStatus;
  workSitePhoto: PunchComponentStatus;
  customerLocation: PunchComponentStatus;
  remarks: PunchComponentStatus;
  signature: PunchComponentStatus;
  customFields: CustomFieldDefinition[];
}

/** The evidence components a punch can be asked for, in presentation order. */
export const PUNCH_COMPONENTS: Array<{ key: keyof PunchConfig; label: string; hint: string }> = [
  { key: 'gps', label: 'GPS location', hint: 'Coordinates captured at the moment of the punch.' },
  { key: 'selfie', label: 'Selfie', hint: 'Front-camera photo of the person punching.' },
  { key: 'vehicleMeter', label: 'Odometer reading', hint: 'Vehicle meter reading, with a photo of the dial.' },
  { key: 'vehiclePhoto', label: 'Vehicle photo', hint: 'Photo of the vehicle at the start or end of the shift.' },
  { key: 'workSitePhoto', label: 'Work site photo', hint: 'Photo of the site the person is standing at.' },
  { key: 'customerLocation', label: 'Customer location', hint: 'The customer site the punch is made against.' },
  { key: 'remarks', label: 'Remarks', hint: 'A short note explaining the punch.' },
  { key: 'signature', label: 'Signature', hint: 'On-screen signature capture.' },
];

export interface RegularizationConfig {
  allowRegularization: boolean;
  allowMissedPunch: boolean;
  allowTimeCorrection: boolean;
  maxRequestsPerMonth: number;
  regularizationWindowDays: number;
}

export const DEFAULT_PUNCH_CONFIG: PunchConfig = {
  selfie: 'DISABLED',
  gps: 'REQUIRED',
  vehicleMeter: 'DISABLED',
  vehiclePhoto: 'DISABLED',
  workSitePhoto: 'DISABLED',
  customerLocation: 'DISABLED',
  remarks: 'DISABLED',
  signature: 'DISABLED',
  customFields: [],
};

export const DEFAULT_REGULARIZATION_CONFIG: RegularizationConfig = {
  allowRegularization: true,
  allowMissedPunch: true,
  allowTimeCorrection: true,
  maxRequestsPerMonth: 5,
  regularizationWindowDays: 7,
};

export function clonePunch(src?: PunchConfig | null): PunchConfig {
  return {
    ...DEFAULT_PUNCH_CONFIG,
    ...(src ?? {}),
    customFields: (src?.customFields ?? []).map(field => ({ ...field })),
  };
}

export function cloneRegularization(src?: RegularizationConfig | null): RegularizationConfig {
  return { ...DEFAULT_REGULARIZATION_CONFIG, ...(src ?? {}) };
}

/** Frozen onto the attendance row at punch-in. Punch-out is judged against this. */
export interface PunchPolicySnapshot {
  policyId?: string | null;
  policyName?: string;
  punchInConfig?: PunchConfig;
  punchOutConfig?: PunchConfig;
}

export function punchEnabled(config: PunchConfig | null | undefined): Array<{
  key: keyof PunchConfig;
  label: string;
  status: PunchComponentStatus;
}> {
  if (!config) return [];
  return PUNCH_COMPONENTS.filter(c => {
    const status = config[c.key];
    return status === 'REQUIRED' || status === 'OPTIONAL';
  }).map(c => ({
    key: c.key,
    label: c.label,
    status: config[c.key] as PunchComponentStatus,
  }));
}

export type PolicyType = 'ATTENDANCE' | 'LEAVE' | 'EXPENSE' | 'TRACKING' | 'VISIT' | 'INSPECTION';
export type PolicyTargetType = 'COMPANY' | 'DEPARTMENT' | 'DESIGNATION' | 'USER';

export interface LeavePolicyConfig {
  annualLeaveQuota: number;
  sickLeaveQuota: number;
  casualLeaveQuota: number;
  maxConsecutiveDays: number;
  allowSandwichLeaves: boolean;
  allowHalfDay: boolean;
  noticePeriodDays: number;
  allowNegativeBalance: boolean;
  maxNegativeDays: number;
  requireManagerApproval: boolean;
}

export const DEFAULT_LEAVE_CONFIG: LeavePolicyConfig = {
  annualLeaveQuota: 18,
  sickLeaveQuota: 12,
  casualLeaveQuota: 12,
  maxConsecutiveDays: 10,
  allowSandwichLeaves: true,
  allowHalfDay: true,
  noticePeriodDays: 2,
  allowNegativeBalance: false,
  maxNegativeDays: 0,
  requireManagerApproval: true,
};

export interface ExpensePolicyConfig {
  maxDailyClaim: number;
  receiptMandatoryThreshold: number;
  mileageRatePerKm: number;
  autoApprovalLimit: number;
  allowFuelExpense: boolean;
  allowFoodExpense: boolean;
  allowStayExpense: boolean;
  allowTravelExpense: boolean;
  allowMiscellaneousExpense: boolean;
}

export const DEFAULT_EXPENSE_CONFIG: ExpensePolicyConfig = {
  maxDailyClaim: 2000,
  receiptMandatoryThreshold: 500,
  mileageRatePerKm: 12,
  autoApprovalLimit: 500,
  allowFuelExpense: true,
  allowFoodExpense: true,
  allowStayExpense: true,
  allowTravelExpense: true,
  allowMiscellaneousExpense: true,
};

export interface TrackingPolicyConfig {
  trackingIntervalSeconds: number;
  workingHoursOnly: boolean;
  highAccuracy: boolean;
  batteryOptimization: boolean;
  geofenceRadiusMeters: number;
  offlineSyncIntervalSeconds: number;
}

export const DEFAULT_TRACKING_CONFIG: TrackingPolicyConfig = {
  trackingIntervalSeconds: 120,
  workingHoursOnly: true,
  highAccuracy: true,
  batteryOptimization: true,
  geofenceRadiusMeters: 100,
  offlineSyncIntervalSeconds: 300,
};

export interface VisitPolicyConfig {
  requireCheckInSelfie: boolean;
  requireSignature: boolean;
  requireCustomerLocationVerification: boolean;
  maxAllowedDistanceMeters: number;
  minVisitDurationMinutes: number;
  requireMeetingNotes: boolean;
  allowOfflineVisits: boolean;
}

export const DEFAULT_VISIT_CONFIG: VisitPolicyConfig = {
  requireCheckInSelfie: false,
  requireSignature: true,
  requireCustomerLocationVerification: true,
  maxAllowedDistanceMeters: 200,
  minVisitDurationMinutes: 5,
  requireMeetingNotes: true,
  allowOfflineVisits: true,
};

export interface InspectionPolicyConfig {
  minPhotosRequired: number;
  requireChecklistCompletion: boolean;
  requireSupervisorSignoff: boolean;
  passThresholdScore: number;
  requireGpsTagging: boolean;
}

export const DEFAULT_INSPECTION_CONFIG: InspectionPolicyConfig = {
  minPhotosRequired: 2,
  requireChecklistCompletion: true,
  requireSupervisorSignoff: false,
  passThresholdScore: 70,
  requireGpsTagging: true,
};

export interface Policy {
  id: string;
  companyId?: string;
  type: PolicyType;
  name: string;
  description?: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
  punchInConfig?: PunchConfig;
  punchOutConfig?: PunchConfig;
  regularizationConfig?: RegularizationConfig | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendancePolicy = Policy;

export const POLICY_TYPE_LABELS: Record<
  PolicyType,
  { label: string; icon: string; description: string; tone: 'neutral' | 'ok' | 'warn' | 'risk' | 'info' }
> = {
  ATTENDANCE: {
    label: 'Attendance Policy',
    icon: 'clock',
    description: 'Punch evidence rules, GPS boundaries, and regularization windows',
    tone: 'info',
  },
  LEAVE: {
    label: 'Leave Policy',
    icon: 'calendar',
    description: 'Annual quotas, sandwich rules, notice periods, and manager approvals',
    tone: 'ok',
  },
  EXPENSE: {
    label: 'Expense Policy',
    icon: 'dollar',
    description: 'Daily claim limits, receipt thresholds, and mileage rates',
    tone: 'warn',
  },
  TRACKING: {
    label: 'GPS & Tracking Policy',
    icon: 'navigation',
    description: 'Location sync intervals, battery modes, and geofence accuracy',
    tone: 'info',
  },
  VISIT: {
    label: 'Customer Visit Policy',
    icon: 'briefcase',
    description: 'On-site photo/signature requirements and proximity verification',
    tone: 'neutral',
  },
  INSPECTION: {
    label: 'Inspection Policy',
    icon: 'clipboard',
    description: 'Site audit checklists, mandatory photo counts, and passing scores',
    tone: 'warn',
  },
};

/** Where a person's effective policy came from, resolved by the API. */
export type UserRole =
  | 'MASTER_SUPER_ADMIN'
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'EMPLOYEE';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  loginId: string;
  role: UserRole;
  roleLabel: string;
  roleOrder: number;
  designation?: string | null;
  companyId: string;
  companyName: string;
  companyCode: string;
  companyLogoUrl?: string | null;
  defaultPassword: string;
  defaultMpin: string;
}

export interface DemoTenantRoleGroup {
  role: string;
  roleLabel: string;
  roleOrder: number;
  users: DemoUser[];
}

export interface DemoTenant {
  companyId: string;
  companyName: string;
  companyCode: string;
  companyLogoUrl?: string | null;
  roles: DemoTenantRoleGroup[];
  userCount: number;
}

export interface DemoUsersResponse {
  tenants: DemoTenant[];
  users: DemoUser[];
  totalCount: number;
}

export type PolicySource = 'USER' | 'DEPARTMENT' | 'DESIGNATION' | 'COMPANY' | 'SYSTEM';

export interface EffectivePolicy {
  source: PolicySource;
  policyId: string | null;
  policyName: string;
  policyType?: PolicyType;
  config?: Record<string, unknown>;
  punchInConfig: PunchConfig;
  punchOutConfig: PunchConfig;
  regularizationConfig: RegularizationConfig;
}

export const POLICY_SOURCE_LABEL: Record<PolicySource, string> = {
  USER: 'Assigned to you directly',
  DEPARTMENT: 'Inherited from your department',
  DESIGNATION: 'Inherited from your job title',
  COMPANY: 'Company default policy',
  SYSTEM: 'System fallback — no policy configured',
};

export interface PolicyAssignments {
  counts: { users: number; departments: number; designations: number; total: number };
  details: {
    departments: Array<{ id: string; name: string }>;
    designations: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string; employeeId?: string | null; role: Role }>;
  };
}

/* ---- Attendance summaries ------------------------------------------------- */

/** One calendar day of a person's month, as grouped by `/attendance/summary`. */
export interface MonthDay {
  date: string;
  dayOfWeek: string;
  totalHours: number;
  sessionsCount: number;
  records: AttendanceRecord[];
}

export interface MonthSummary {
  mode: 'monthly';
  month: number;
  year: number;
  monthName: string;
  totalHours: number;
  totalDaysWorked: number;
  days: MonthDay[];
}

export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Regularization {
  id: string;
  userId: string;
  user?: { id: string; name: string; employeeId?: string | null };
  approver?: { id: string; name: string } | null;
  attendanceId?: string | null;
  attendance?: AttendanceRecord | null;
  date: string;
  requestedPunchIn?: string | null;
  requestedPunchOut?: string | null;
  originalPunchIn?: string | null;
  originalPunchOut?: string | null;
  requestedPunchInOdometer?: number | null;
  requestedPunchOutOdometer?: number | null;
  originalPunchInOdometer?: number | null;
  originalPunchOutOdometer?: number | null;
  reason: string;
  remarks?: string | null;
  status: RegularizationStatus;
  createdAt: string;
}

/** One recorded GPS fix, as returned inside a day's route. */
export interface RoutePoint {
  id?: string;
  latitude: number | string;
  longitude: number | string;
  accuracy?: number | string | null;
  batteryLevel?: number | null;
  recordedAt: string;
}

/** A person's movement for one day, with the distance already computed. */
export interface RouteMetadata {
  points: RoutePoint[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  averageSpeedMs: number;
  startTime: string | null;
  endTime: string | null;
}

export interface LivePosition {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  batteryLevel: number | null;
  recordedAt: string;
  /** Last fix older than 15 minutes: treat the position as indicative only. */
  isStale: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  /** Some older clients labelled this phoneNumber; the API field is `phone`. */
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  village?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
}

export function customerPhone(c: Customer | null | undefined): string {
  return c?.phone || c?.phoneNumber || '—';
}

export const CUSTOMER_TYPES = ['RETAILER', 'DISTRIBUTOR', 'DEALER', 'FARMER'] as const;

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unitPrice?: number | string | null;
  price?: number | string | null;
  unit?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Visit {
  id: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'city' | 'type' | 'village'> | null;
  userId: string;
  user?: Pick<Person, 'id' | 'name'> | null;
  checkInTime: string;
  checkOutTime?: string | null;
  duration?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  purpose?: string | null;
  notes?: string | null;
  outcome?: string | null;
  /** Stored as a comma-separated string on the API. */
  productsDiscussed?: string | string[] | null;
  imageUrl?: string | null;
  photoUrls?: string[] | null;
  imageUrls?: string[] | null;
  createdAt?: string;
}

export function visitProducts(visit: Visit | null | undefined): string[] {
  const raw = visit?.productsDiscussed;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export interface SaleItem {
  id?: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'> | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
}

export interface Sale {
  id: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'city' | 'type'> | null;
  userId: string;
  user?: Pick<Person, 'id' | 'name'> | null;
  items?: SaleItem[];
  totalAmount: number | string;
  remarks?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Inspection {
  id: string;
  siteName: string;
  category?: string | null;
  observation?: string | null;
  observations?: string | null;
  recommendation?: string | null;
  recommendations?: string | null;
  userId: string;
  user?: Pick<Person, 'id' | 'name'> | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrls?: string[] | null;
  createdAt: string;
}

export function inspectionNote(row: Inspection): string {
  return row.observation || row.observations || '—';
}

export function inspectionAdvice(row: Inspection): string {
  return row.recommendation || row.recommendations || '—';
}

export const INSPECTION_CATEGORIES = [
  { value: 'QUALITY_CONTROL', label: 'Quality control' },
  { value: 'STOCK_AUDIT', label: 'Stock & inventory audit' },
  { value: 'CUSTOMER_FEEDBACK', label: 'Customer feedback' },
  { value: 'ROUTINE_CHECK', label: 'Routine check' },
] as const;

/** The modules the platform can actually deliver today. */
export type ModuleKey = 'ATTENDANCE' | 'GPS' | 'REGULARIZATION';

export interface CompanyModule {
  id?: string;
  module: string;
  isEnabled: boolean;
}

export interface Company {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
  legalName?: string | null;
  officialEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  companyType?: string | null;
  employeeCount?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  timezone?: string | null;
  currency?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  isGpsEnabled?: boolean;
  companyLogoUrl?: string | null;
  logoUrl?: string | null;
  defaultAttendancePolicyId?: string | null;
  entitledSlugs?: string[];
  entitlements?: Array<{ isEnabled: boolean; capability?: { slug: string; name?: string; module?: string } }>;
  modules?: CompanyModule[];
  _count?: { users?: number; branches?: number; departments?: number } | null;
  userCount?: number;
  createdAt?: string;
}

/** Whether a module is switched on for a company, defaulting to off. */
export function moduleEnabled(company: Company | null, key: ModuleKey): boolean {
  return company?.modules?.some(m => m.module === key && m.isEnabled) ?? false;
}

/** Company-wide "today" figures from `/dashboard/summary`. */
export interface DashboardSummary {
  date: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  visitsToday: number;
  salesCount: number;
  revenue: number;
  inspections: number;
}

/** Manager-scoped figures from `/dashboard/team-summary`. */
export interface TeamSummary {
  teamSize: number;
  presentToday: number;
  visitsToday: number;
  salesToday: number;
  revenueToday: number;
}

export interface SalesSummary {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalTransactions: number;
  topProducts: Array<{ productId: string; name: string; totalQty: number; totalRevenue: number }>;
}

export interface AttendanceSummaryRange {
  startDate: string;
  endDate: string;
  totalEmployees: number;
  totalRecords: number;
  uniqueEmployees: number;
  completedShifts: number;
  totalWorkingHours: number;
}

/** Shapes returned by `/reports/{attendance|visits|sales}`. */
export interface AttendanceReport {
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalWorkingHours: number;
  records: Array<{
    id: string;
    employee?: Pick<Person, 'id' | 'name' | 'employeeId'> | null;
    punchInTime: string;
    punchOutTime?: string | null;
    workingHours?: number | null;
    punchInLocation?: { latitude: number; longitude: number } | null;
    punchOutLocation?: { latitude: number; longitude: number } | null;
  }>;
}

export interface VisitsReport {
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalDurationMinutes: number;
  records: Array<{
    id: string;
    employee?: Pick<Person, 'id' | 'name'> | null;
    customer?: Pick<Customer, 'id' | 'name'> | null;
    checkInTime: string;
    checkOutTime?: string | null;
    durationMinutes?: number | null;
    productsDiscussed?: string | null;
    notes?: string | null;
    location?: { latitude: number; longitude: number } | null;
  }>;
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalRevenue: number;
  totalItemsSold: number;
  records: Array<{
    id: string;
    employee?: Pick<Person, 'id' | 'name'> | null;
    customer?: Pick<Customer, 'id' | 'name'> | null;
    totalAmount: number;
    remarks?: string | null;
    createdAt: string;
    items: Array<{
      product?: Pick<Product, 'id' | 'name' | 'sku'> | null;
      quantity: number;
      price: number;
      totalPrice: number;
    }>;
  }>;
}

/* ---- Shift state ---------------------------------------------------------
   One vocabulary for "what is this person's day doing", derived in one place
   so the roster, the command centre and the live board never disagree. ----- */

export type ShiftState = 'on-duty' | 'completed' | 'absent' | 'not-applicable';

export function shiftStateOf(record: AttendanceRecord | null | undefined): ShiftState {
  if (!record) return 'absent';
  return record.punchOutTime ? 'completed' : 'on-duty';
}

export const SHIFT_LABEL: Record<ShiftState, string> = {
  'on-duty': 'On duty',
  completed: 'Shift closed',
  absent: 'No punch',
  'not-applicable': 'Not tracked',
};
