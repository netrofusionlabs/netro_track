import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  address: z.string().max(255).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isHq: z.boolean().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateBranchPayload = z.infer<typeof createBranchSchema>;
export type UpdateBranchPayload = z.infer<typeof updateBranchSchema>;
