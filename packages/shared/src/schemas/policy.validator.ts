import { z } from 'zod';

// ==========================================
// 1. Policy Enums & Target Types
// ==========================================

export const policyTypeSchema = z.enum([
  'ATTENDANCE',
  'LEAVE',
  'EXPENSE',
  'TRACKING',
  'VISIT',
  'INSPECTION',
]);

export type PolicyType = z.infer<typeof policyTypeSchema>;

export const policyTargetTypeSchema = z.enum([
  'COMPANY',
  'DEPARTMENT',
  'DESIGNATION',
  'USER',
]);

export type PolicyTargetType = z.infer<typeof policyTargetTypeSchema>;

// ==========================================
// 2. Attendance Policy Configurations
// ==========================================

export const punchComponentStatusSchema = z.enum(['DISABLED', 'OPTIONAL', 'REQUIRED']);
export type PunchComponentStatus = z.infer<typeof punchComponentStatusSchema>;

export const customFieldSchema = z.object({
  key: z.string().min(1, 'Custom field key is required'),
  label: z.string().min(1, 'Custom field label is required'),
  type: z.enum(['TEXT', 'NUMBER']),
  status: punchComponentStatusSchema.default('DISABLED'),
});
export type CustomFieldDefinition = z.infer<typeof customFieldSchema>;

export const punchConfigSchema = z.object({
  selfie: punchComponentStatusSchema.default('DISABLED'),
  gps: punchComponentStatusSchema.default('DISABLED'),
  vehicleMeter: punchComponentStatusSchema.default('DISABLED'),
  vehiclePhoto: punchComponentStatusSchema.default('DISABLED'),
  workSitePhoto: punchComponentStatusSchema.default('DISABLED'),
  customerLocation: punchComponentStatusSchema.default('DISABLED'),
  remarks: punchComponentStatusSchema.default('DISABLED'),
  signature: punchComponentStatusSchema.default('DISABLED'),
  customFields: z.array(customFieldSchema).default([]),
});
export type PunchConfig = z.infer<typeof punchConfigSchema>;

export const regularizationConfigSchema = z.object({
  allowRegularization: z.boolean().default(true),
  allowMissedPunch: z.boolean().default(true),
  allowTimeCorrection: z.boolean().default(true),
  maxRequestsPerMonth: z.number().int().min(0).default(5),
  regularizationWindowDays: z.number().int().min(0).default(7),
});
export type RegularizationConfig = z.infer<typeof regularizationConfigSchema>;

export const attendancePolicyConfigSchema = z.object({
  punchInConfig: punchConfigSchema.default({
    selfie: 'DISABLED',
    gps: 'REQUIRED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'DISABLED',
    signature: 'DISABLED',
    customFields: [],
  }),
  punchOutConfig: punchConfigSchema.default({
    selfie: 'DISABLED',
    gps: 'REQUIRED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'DISABLED',
    signature: 'DISABLED',
    customFields: [],
  }),
  regularizationConfig: regularizationConfigSchema.default({
    allowRegularization: true,
    allowMissedPunch: true,
    allowTimeCorrection: true,
    maxRequestsPerMonth: 5,
    regularizationWindowDays: 7,
  }),
});
export type AttendancePolicyConfig = z.infer<typeof attendancePolicyConfigSchema>;

// ==========================================
// 3. Leave Policy Configuration
// ==========================================

export const leavePolicyConfigSchema = z.object({
  annualLeaveQuota: z.number().int().min(0).default(18),
  sickLeaveQuota: z.number().int().min(0).default(12),
  casualLeaveQuota: z.number().int().min(0).default(12),
  maxConsecutiveDays: z.number().int().min(1).default(10),
  allowSandwichLeaves: z.boolean().default(true),
  allowHalfDay: z.boolean().default(true),
  noticePeriodDays: z.number().int().min(0).default(2),
  allowNegativeBalance: z.boolean().default(false),
  maxNegativeDays: z.number().int().min(0).default(0),
  requireManagerApproval: z.boolean().default(true),
});
export type LeavePolicyConfig = z.infer<typeof leavePolicyConfigSchema>;

// ==========================================
// 4. Expense Policy Configuration
// ==========================================

export const expensePolicyConfigSchema = z.object({
  maxDailyClaim: z.number().min(0).default(2000),
  receiptMandatoryThreshold: z.number().min(0).default(500),
  mileageRatePerKm: z.number().min(0).default(12),
  autoApprovalLimit: z.number().min(0).default(500),
  allowFuelExpense: z.boolean().default(true),
  allowFoodExpense: z.boolean().default(true),
  allowStayExpense: z.boolean().default(true),
  allowTravelExpense: z.boolean().default(true),
  allowMiscellaneousExpense: z.boolean().default(true),
});
export type ExpensePolicyConfig = z.infer<typeof expensePolicyConfigSchema>;

// ==========================================
// 5. Tracking / GPS Policy Configuration
// ==========================================

export const trackingPolicyConfigSchema = z.object({
  trackingIntervalSeconds: z.number().int().min(15).max(1800).default(120),
  workingHoursOnly: z.boolean().default(true),
  highAccuracy: z.boolean().default(true),
  batteryOptimization: z.boolean().default(true),
  geofenceRadiusMeters: z.number().int().min(10).default(100),
  offlineSyncIntervalSeconds: z.number().int().min(30).default(300),
});
export type TrackingPolicyConfig = z.infer<typeof trackingPolicyConfigSchema>;

// ==========================================
// 6. Visit Policy Configuration
// ==========================================

export const visitPolicyConfigSchema = z.object({
  requireCheckInSelfie: z.boolean().default(false),
  requireSignature: z.boolean().default(true),
  requireCustomerLocationVerification: z.boolean().default(true),
  maxAllowedDistanceMeters: z.number().int().min(10).default(200),
  minVisitDurationMinutes: z.number().int().min(0).default(5),
  requireMeetingNotes: z.boolean().default(true),
  allowOfflineVisits: z.boolean().default(true),
});
export type VisitPolicyConfig = z.infer<typeof visitPolicyConfigSchema>;

// ==========================================
// 7. Inspection Policy Configuration
// ==========================================

export const inspectionPolicyConfigSchema = z.object({
  minPhotosRequired: z.number().int().min(0).default(2),
  requireChecklistCompletion: z.boolean().default(true),
  requireSupervisorSignoff: z.boolean().default(false),
  passThresholdScore: z.number().min(0).max(100).default(70),
  requireGpsTagging: z.boolean().default(true),
});
export type InspectionPolicyConfig = z.infer<typeof inspectionPolicyConfigSchema>;

// ==========================================
// 8. General Policy CRUD Schemas
// ==========================================

export const createPolicySchema = z.object({
  type: policyTypeSchema.default('ATTENDANCE'),
  name: z.string().min(1, 'Policy name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  config: z.record(z.any()).default({}),
  // Structured backward-compatible fields for ATTENDANCE:
  punchInConfig: punchConfigSchema.optional(),
  punchOutConfig: punchConfigSchema.optional(),
  regularizationConfig: regularizationConfigSchema.optional(),
});

export const updatePolicySchema = createPolicySchema.partial();

export const assignPolicySchema = z.object({
  policyId: z.string().uuid().nullable().optional(),
  policyType: policyTypeSchema.default('ATTENDANCE'),
  targetType: policyTargetTypeSchema,
  targetId: z.string().min(1, 'Target ID is required'),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type AssignPolicyInput = z.infer<typeof assignPolicySchema>;

// Backward compatibility schemas & types
export const createAttendancePolicySchema = z.object({
  type: policyTypeSchema.default('ATTENDANCE'),
  name: z.string().min(1, 'Policy name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  punchInConfig: punchConfigSchema,
  punchOutConfig: punchConfigSchema,
  regularizationConfig: regularizationConfigSchema.default({
    allowRegularization: true,
    allowMissedPunch: true,
    allowTimeCorrection: true,
    maxRequestsPerMonth: 5,
    regularizationWindowDays: 7,
  }),
});

export const updateAttendancePolicySchema = createAttendancePolicySchema.partial();

export type CreateAttendancePolicyInput = z.infer<typeof createAttendancePolicySchema>;
export type UpdateAttendancePolicyInput = z.infer<typeof updateAttendancePolicySchema>;
