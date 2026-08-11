import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';

interface DashboardSummary {
  date: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  visitsToday: number;
  salesCount: number;
  revenue: number;
  inspections: number;
}

interface TeamSummary {
  teamSize: number;
  presentToday: number;
  visitsToday: number;
  salesToday: number;
  revenueToday: number;
}

export function useDashboardSummary(date?: string) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', date],
    queryFn: async () => {
      const params = date ? { date } : {};
      const { data } = await api.get('/dashboard/summary', { params });
      return data.data;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useTeamSummary(date?: string) {
  return useQuery<TeamSummary>({
    queryKey: ['dashboard', 'team-summary', date],
    queryFn: async () => {
      const params = date ? { date } : {};
      const { data } = await api.get('/dashboard/team-summary', { params });
      return data.data;
    },
    staleTime: 60_000,
  });
}
