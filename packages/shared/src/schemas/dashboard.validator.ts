import { z } from 'zod';

// ── Dashboard summary query ───────────────────────────────────────────────────
export const dashboardSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional()
    .describe('Target date for summary (defaults to today)'),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;

// ── Attendance summary query ──────────────────────────────────────────────────
export const attendanceSummaryQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;

// ── Sales summary query ───────────────────────────────────────────────────────
export const salesSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')
    .optional(),
});

export type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;

// ── Team summary query (manager-scoped) ───────────────────────────────────────
export const teamSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

export type TeamSummaryQuery = z.infer<typeof teamSummaryQuerySchema>;
