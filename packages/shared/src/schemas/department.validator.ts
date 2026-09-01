import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  branchId: z.string().uuid().optional().nullable(),
  attendancePolicyId: z.string().uuid().optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateDepartmentPayload = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentPayload = z.infer<typeof updateDepartmentSchema>;
