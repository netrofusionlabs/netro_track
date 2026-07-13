import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, { message: 'Customer name must be at least 2 characters' }),
  phone: z.string().optional().nullable(),
  email: z.string().email({ message: 'Invalid email address' }).optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  type: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
