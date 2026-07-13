import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters' }),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  price: z.number().positive({ message: 'Price must be a positive number' }).optional().nullable(),
  imageUrl: z.string().url({ message: 'Invalid image URL' }).optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
