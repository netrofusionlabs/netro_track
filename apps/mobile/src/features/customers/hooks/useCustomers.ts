import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { CustomerRecord } from '../types';

export const customerKeys = {
  all: ['customers'] as const
};

export function useCustomers() {
  return useQuery<CustomerRecord[]>({
    queryKey: customerKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: CustomerRecord[] }>('/customers');
      return res.data.data;
    }
  });
}
