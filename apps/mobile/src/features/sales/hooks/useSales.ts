import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { SaleRecord, CreateSalePayload } from '../types';

export const saleKeys = {
  all: ['sales'] as const,
  today: ['sales', 'today'] as const
};

export function useSales() {
  return useQuery<SaleRecord[]>({
    queryKey: saleKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: SaleRecord[] }>('/product-sales');
      return res.data.data;
    }
  });
}

export function useTodaySales() {
  return useQuery<SaleRecord[]>({
    queryKey: saleKeys.today,
    queryFn: async () => {
      const res = await api.get<{ data: SaleRecord[] }>('/product-sales/today');
      return res.data.data;
    }
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation<SaleRecord, Error, CreateSalePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: SaleRecord }>('/product-sales', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      qc.invalidateQueries({ queryKey: saleKeys.today });
    }
  });
}
