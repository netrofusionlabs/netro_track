import { z } from 'zod';

export const loginSchema = z.object({
  loginId: z.string().min(3, { message: 'Login ID or Email is required' }).refine(
    (val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const parts = val.split('-');
      const isLoginId = parts.length >= 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0;
      return isEmail || isLoginId;
    },
    { message: 'Must be a valid email or in the format COMPANY-EMPLOYEE (e.g. Netro-emp001)' }
  ),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  deviceId: z.string().min(1, { message: 'Device ID is required' })
});

export type LoginInput = z.infer<typeof loginSchema>;
