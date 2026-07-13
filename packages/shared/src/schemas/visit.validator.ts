import { z } from 'zod';

export const createVisitSchema = z.object({
  customerId: z.string().uuid(),
  checkInTime: z.string().datetime().or(z.date()),
  checkOutTime: z.string().datetime().or(z.date()).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  productsDiscussed: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
