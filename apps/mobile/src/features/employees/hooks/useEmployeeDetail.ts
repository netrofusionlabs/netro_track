import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { VisitRecord } from '../../visits/types';
import type { SaleRecord } from '../../sales/types';
import type { InspectionRecord } from '../../inspections/types';
import type { AttendanceRecord } from '../../attendance/types';
import type { AttendanceSummaryData } from '../../attendance/hooks/useAttendance';

export const employeeDetailKeys = {
  attendance: (employeeId: string) => ['employee-detail', employeeId, 'attendance'] as const,
  visits: (employeeId: string) => ['employee-detail', employeeId, 'visits'] as const,
  sales: (employeeId: string) => ['employee-detail', employeeId, 'sales'] as const,
  inspections: (employeeId: string) => ['employee-detail', employeeId, 'inspections'] as const,
};

export const employeeHistoryKeys = {
  attendance: (employeeId: string) => ['employee-history', employeeId, 'attendance'] as const,
};

export function useEmployeeAttendanceToday(employeeId: string) {
  return useQuery<AttendanceRecord | null>({
    queryKey: employeeDetailKeys.attendance(employeeId),
    queryFn: async () => {
      const res = await api.get<{ data: AttendanceRecord | null }>(
        `/attendance/team?employeeId=${employeeId}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeAttendanceHistory(employeeId: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: employeeHistoryKeys.attendance(employeeId),
    queryFn: async () => {
      const res = await api.get<{ data: AttendanceRecord[] }>(
        `/attendance/history?employeeId=${employeeId}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeAttendanceSummary(
  employeeId: string,
  mode: 'today' | 'monthly' | 'all',
  year?: number,
  month?: number
) {
  return useQuery<AttendanceSummaryData>({
    queryKey: ['employee-attendance-summary', employeeId, mode, year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ mode, employeeId });
      if (year) params.append('year', String(year));
      if (month) params.append('month', String(month));
      const res = await api.get<{ data: AttendanceSummaryData }>(
        `/attendance/summary?${params.toString()}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeVisits(employeeId: string) {
  return useQuery<VisitRecord[]>({
    queryKey: employeeDetailKeys.visits(employeeId),
    queryFn: async () => {
      const res = await api.get<{ data: VisitRecord[] }>(
        `/customer-visits?employeeId=${employeeId}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeSales(employeeId: string) {
  return useQuery<SaleRecord[]>({
    queryKey: employeeDetailKeys.sales(employeeId),
    queryFn: async () => {
      const res = await api.get<{ data: SaleRecord[] }>(
        `/product-sales?employeeId=${employeeId}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeInspections(employeeId: string) {
  return useQuery<InspectionRecord[]>({
    queryKey: employeeDetailKeys.inspections(employeeId),
    queryFn: async () => {
      const res = await api.get<{ data: InspectionRecord[] }>(
        `/inspections?employeeId=${employeeId}`
      );
      return res.data.data;
    },
    enabled: !!employeeId,
  });
}
