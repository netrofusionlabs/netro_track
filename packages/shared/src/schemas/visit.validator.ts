import { z } from 'zod';

export const createVisitSchema = z.object({
  /** Client-generated UUID — used for idempotent sync (BR-SY03). */
  localId: z.string().uuid('localId must be a valid UUID'),

  customerId: z.string().uuid(),
  checkInTime: z.string().datetime().or(z.date()),
  checkOutTime: z.string().datetime().or(z.date()).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  productsDiscussed: z.string().optional(),
  notes: z.string().optional(),

  /** Selfie or customer-site photos uploaded to R2 — URLs stored after upload. */
  imageUrl: z.string().url().optional().or(z.literal('')),
  photoUrls: z.array(z.string().url()).max(5).optional(),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;

