import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { ProductRecord } from '../types';

export const productKeys = {
  all: ['products'] as const
};

export function useProducts() {
  return useQuery<ProductRecord[]>({
    queryKey: productKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: ProductRecord[] }>('/products');
      return res.data.data;
    }
  });
}
