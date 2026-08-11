import { z } from 'zod';

export const createSaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const createSaleSchema = z.object({
  /** Client-generated UUID — used for idempotent sync (BR-SY03). */
  localId: z.string().uuid('localId must be a valid UUID'),

  customerId: z.string().uuid(),
  remarks: z.string().optional(),
  items: z.array(createSaleItemSchema).nonempty('Sale must contain at least one product'),
});

export type CreateSaleItemInput = z.infer<typeof createSaleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

