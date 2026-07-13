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

// MPIN setup — requires authentication (called right after first login)
export const setupMpinSchema = z.object({
  mpin: z
    .string()
    .min(4, { message: 'MPIN must be 4–6 digits' })
    .max(6, { message: 'MPIN must be 4–6 digits' })
    .regex(/^\d+$/, { message: 'MPIN must contain digits only' })
});

export type SetupMpinInput = z.infer<typeof setupMpinSchema>;

// MPIN login — public, resolves the user by loginId then checks MPIN
export const mpinLoginSchema = z.object({
  loginId: z.string().min(3, { message: 'Login ID is required' }),
  mpin: z
    .string()
    .min(4, { message: 'MPIN must be 4–6 digits' })
    .max(6, { message: 'MPIN must be 4–6 digits' })
    .regex(/^\d+$/, { message: 'MPIN must contain digits only' }),
  deviceId: z.string().min(1, { message: 'Device ID is required' })
});

export type MpinLoginInput = z.infer<typeof mpinLoginSchema>;
