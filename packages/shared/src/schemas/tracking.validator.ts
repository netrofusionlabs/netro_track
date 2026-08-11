import { z } from 'zod';

// ─── Single GPS point schema (BR-G07) ────────────────────────────────────────
export const gpsPointSchema = z.object({
  /** Client-generated UUID for idempotent deduplication on the server (BR-SY03). */
  localId: z.string().uuid('localId must be a valid UUID'),

  /** Links this point to the active attendance session. */
  attendanceId: z.string().uuid().optional(),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  /** Horizontal accuracy in metres. Points > 100 m flagged per BR-G08. */
  accuracy: z.number().nonnegative().optional(),

  /** Speed in m/s; 0 when stationary. */
  speed: z.number().nonnegative().optional(),

  /** Bearing in degrees from north (0–360). */
  heading: z.number().min(0).max(360).optional(),

  /** Altitude in metres above sea level. */
  altitude: z.number().optional(),

  /** Battery percentage (0–100). */
  batteryLevel: z.number().int().min(0).max(100).optional(),

  /** Whether device is currently charging. */
  batteryCharging: z.boolean().optional(),

  /** Active network connection type. */
  networkType: z.enum(['wifi', 'cellular', 'none']).optional(),

  /** Location provider used. */
  gpsProvider: z.enum(['gps', 'network', 'fused']).optional(),

  /** Whether accuracy is within 100 m threshold (BR-G08). */
  isAccurate: z.boolean().optional(),

  /** ISO 8601 UTC timestamp of when the point was captured on device. */
  recordedAt: z.string().datetime(),
});

// ─── Batch sync payload ───────────────────────────────────────────────────────
export const gpsBatchSyncSchema = z.object({
  points: z
    .array(gpsPointSchema)
    .nonempty('Batch must contain at least one GPS point')
    .max(500, 'Batch cannot exceed 500 points per request'),
});

export type GpsPointInput = z.infer<typeof gpsPointSchema>;
export type GpsBatchSyncInput = z.infer<typeof gpsBatchSyncSchema>;

