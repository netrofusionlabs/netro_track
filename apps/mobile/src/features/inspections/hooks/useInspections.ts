import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { InspectionRecord, CreateInspectionPayload } from '../types';

export const inspectionKeys = {
  all: ['inspections'] as const,
  today: ['inspections', 'today'] as const
};

export function useInspections() {
  return useQuery<InspectionRecord[]>({
    queryKey: inspectionKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: InspectionRecord[] }>('/inspections');
      return res.data.data;
    }
  });
}

export function useTodayInspections() {
  return useQuery<InspectionRecord[]>({
    queryKey: inspectionKeys.today,
    queryFn: async () => {
      const res = await api.get<{ data: InspectionRecord[] }>('/inspections/today');
      return res.data.data;
    }
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation<InspectionRecord, Error, CreateInspectionPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: InspectionRecord }>('/inspections', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionKeys.all });
      qc.invalidateQueries({ queryKey: inspectionKeys.today });
    }
  });
}
