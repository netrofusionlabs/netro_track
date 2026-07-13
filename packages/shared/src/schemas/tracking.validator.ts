import { z } from 'zod';

export const gpsPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  battery: z.number().int().min(0).max(100).optional(),
  networkType: z.string().optional(),
  recordedAt: z.string().datetime()
});

export const gpsBatchSyncSchema = z.object({
  points: z.array(gpsPointSchema).nonempty('Must include at least one GPS point').max(500)
});

export type GpsPointInput = z.infer<typeof gpsPointSchema>;
export type GpsBatchSyncInput = z.infer<typeof gpsBatchSyncSchema>;
