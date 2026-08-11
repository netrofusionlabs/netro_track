import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { startTracking, stopTracking, getCurrentCoords } from '../../../shared/services/trackingService';
import type { AttendanceRecord, PunchPayload } from '../types';

// ── Query keys ──────────────────────────────────────────────────────────────
export const attendanceKeys = {
  today: ['attendance', 'today'] as const,
  history: ['attendance', 'history'] as const,
  summary: (mode: string, year?: number, month?: number) => ['attendance', 'summary', mode, year, month] as const,
  monthly: (year: number, month: number) => ['attendance', 'monthly', year, month] as const
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAttendanceToday() {
  return useQuery<AttendanceRecord | null>({
    queryKey: attendanceKeys.today,
    queryFn: async () => {
      const res = await api.get<{ data: AttendanceRecord | null }>('/attendance/today');
      return res.data.data;
    }
  });
}

export function useAttendanceHistory() {
  return useQuery<AttendanceRecord[]>({
    queryKey: attendanceKeys.history,
    queryFn: async () => {
      const res = await api.get<{ data: AttendanceRecord[] }>('/attendance/history');
      return res.data.data;
    }
  });
}

export interface DailySummaryItem {
  date: string;
  dayOfWeek: string;
  totalHours: number;
  sessionsCount: number;
  records: AttendanceRecord[];
}

export interface MonthlySummaryItem {
  monthKey: string;
  monthName: string;
  totalHours: number;
  sessionsCount: number;
  daysWorked: number;
}

export interface AttendanceSummaryData {
  mode: 'monthly' | 'all' | 'today';
  totalHours: number;
  monthName?: string;
  month?: number;
  year?: number;
  totalDaysWorked?: number;
  totalMonths?: number;
  sessionsCount?: number;
  days?: DailySummaryItem[];
  months?: MonthlySummaryItem[];
  records?: AttendanceRecord[];
}

export function useAttendanceSummary(mode: 'monthly' | 'all' | 'today', year?: number, month?: number) {
  return useQuery<AttendanceSummaryData>({
    queryKey: attendanceKeys.summary(mode, year, month),
    queryFn: async () => {
      const params = new URLSearchParams({ mode });
      if (year) params.append('year', String(year));
      if (month) params.append('month', String(month));
      const res = await api.get<{ data: AttendanceSummaryData }>(`/attendance/summary?${params.toString()}`);
      return res.data.data;
    }
  });
}

export function usePunchIn() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error, PunchPayload | void>({
    mutationFn: async (payload) => {
      // Resolve real GPS coordinates; fall back to 0,0 if unavailable
      const coords = (payload && 'latitude' in payload && payload.latitude !== 0)
        ? payload
        : (await getCurrentCoords()) ?? { latitude: 0, longitude: 0 };

      const res = await api.post<{ data: AttendanceRecord }>('/attendance/punch-in', coords);
      return res.data.data;
    },
    onSuccess: (data) => {
      // Start background GPS tracking after successful punch-in
      startTracking(data.id);
      qc.invalidateQueries({ queryKey: attendanceKeys.today });
      qc.invalidateQueries({ queryKey: attendanceKeys.history });
    }
  });
}

export function usePunchOut() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error, PunchPayload | void>({
    mutationFn: async (payload) => {
      // Resolve real GPS coordinates; fall back to 0,0 if unavailable
      const coords = (payload && 'latitude' in payload && payload.latitude !== 0)
        ? payload
        : (await getCurrentCoords()) ?? { latitude: 0, longitude: 0 };

      const res = await api.post<{ data: AttendanceRecord }>('/attendance/punch-out', coords);
      return res.data.data;
    },
    onSuccess: async () => {
      // Stop background GPS tracking after successful punch-out (triggers final sync)
      await stopTracking();
      qc.invalidateQueries({ queryKey: attendanceKeys.today });
      qc.invalidateQueries({ queryKey: attendanceKeys.history });
    }
  });
}
