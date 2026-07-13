import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { EmployeeRecord } from '../types';

export const employeeKeys = {
  all: ['employees'] as const
};

export function useEmployees() {
  return useQuery<EmployeeRecord[]>({
    queryKey: employeeKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: EmployeeRecord[] }>('/employees');
      return res.data.data;
    }
  });
}
