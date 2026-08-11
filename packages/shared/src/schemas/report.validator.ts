import { z } from 'zod';

// ── Base report query (shared across all report types) ────────────────────────
const baseReportQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  userId: z
    .string()
    .uuid('Invalid user ID')
    .optional()
    .describe('Filter by specific employee (admin/manager only)'),
});

// ── Attendance report query ───────────────────────────────────────────────────
export const attendanceReportQuerySchema = baseReportQuerySchema;

export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>;

// ── Visits report query ───────────────────────────────────────────────────────
export const visitsReportQuerySchema = baseReportQuerySchema.extend({
  customerId: z
    .string()
    .uuid('Invalid customer ID')
    .optional()
    .describe('Filter by specific customer'),
});

export type VisitsReportQuery = z.infer<typeof visitsReportQuerySchema>;

// ── Sales report query ────────────────────────────────────────────────────────
export const salesReportQuerySchema = baseReportQuerySchema.extend({
  customerId: z
    .string()
    .uuid('Invalid customer ID')
    .optional()
    .describe('Filter by specific customer'),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
