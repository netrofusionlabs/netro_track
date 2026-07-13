import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { VisitRecord, CreateVisitPayload } from '../types';

export const visitKeys = {
  all: ['visits'] as const,
  today: ['visits', 'today'] as const
};

export function useVisits() {
  return useQuery<VisitRecord[]>({
    queryKey: visitKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: VisitRecord[] }>('/customer-visits');
      return res.data.data;
    }
  });
}

export function useTodayVisits() {
  return useQuery<VisitRecord[]>({
    queryKey: visitKeys.today,
    queryFn: async () => {
      const res = await api.get<{ data: VisitRecord[] }>('/customer-visits/today');
      return res.data.data;
    }
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation<VisitRecord, Error, CreateVisitPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: VisitRecord }>('/customer-visits', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitKeys.all });
      qc.invalidateQueries({ queryKey: visitKeys.today });
    }
  });
}
