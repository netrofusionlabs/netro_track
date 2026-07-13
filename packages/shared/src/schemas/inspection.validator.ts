import { z } from 'zod';

export const createInspectionSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  category: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  observation: z.string().min(1, 'Observation is required'),
  recommendation: z.string().optional(),
  imageUrls: z.array(z.string().url()).default([])
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
