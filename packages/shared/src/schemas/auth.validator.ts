import { z } from 'zod';

export const loginSchema = z.object({
  companyId: z.string().uuid({ message: 'Invalid Company ID format' }),
  employeeId: z.string().min(3, { message: 'Employee ID must be at least 3 characters' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  deviceId: z.string().min(1, { message: 'Device ID is required' })
});

export type LoginInput = z.infer<typeof loginSchema>;
