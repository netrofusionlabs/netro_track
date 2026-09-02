import { useQuery } from '@tanstack/react-query';
import api from '../../../shared/services/api';

export function useBranches(companyId?: string) {
  return useQuery({
    queryKey: ['branches', companyId],
    queryFn: async () => {
      const params = companyId ? { companyId } : undefined;
      const res = await api.get('/api/v1/branches', { params });
      return res.data?.data || res.data || [];
    },
  });
}

export function useDepartments(companyId?: string) {
  return useQuery({
    queryKey: ['departments', companyId],
    queryFn: async () => {
      const params = companyId ? { companyId } : undefined;
      const res = await api.get('/api/v1/departments', { params });
      return res.data?.data || res.data || [];
    },
  });
}
