import { z } from 'zod';

export const punchInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const punchOutSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export type PunchInInput = z.infer<typeof punchInSchema>;
export type PunchOutInput = z.infer<typeof punchOutSchema>;
