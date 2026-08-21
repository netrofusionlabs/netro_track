import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { startTracking, stopTracking, getCurrentCoords } from '../../../shared/services/trackingService';
import { useAuthStore } from '../../auth/stores/authStore';
import type { AttendanceRecord } from '../types';
import NetInfo from '@react-native-community/netinfo';
import { enqueue, getQueue } from '../../../shared/utils/offlineQueue';
import { storage } from '../../../shared/utils/storage';

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
      const netInfoState = await NetInfo.fetch();
      const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

      if (!isOnline) {
        const attendanceQueue = getQueue<{ latitude: number; longitude: number; evidence?: any }>('attendance');
        const lastPunchIn = [...attendanceQueue].reverse().find(q => q.type === 'PUNCH_IN');
        const lastPunchOut = [...attendanceQueue].reverse().find(q => q.type === 'PUNCH_OUT');

        if (lastPunchIn && (!lastPunchOut || new Date(lastPunchIn.createdAt) > new Date(lastPunchOut.createdAt))) {
          return {
            id: `local_${lastPunchIn.localId}`,
            userId: useAuthStore.getState().user?.id || '',
            companyId: useAuthStore.getState().user?.companyId || '',
            punchInTime: lastPunchIn.createdAt,
            punchInLatitude: lastPunchIn.payload.latitude,
            punchInLongitude: lastPunchIn.payload.longitude,
            punchOutTime: null,
            punchOutLatitude: null,
            punchOutLongitude: null,
            workingHours: null,
            attendancePolicyId: useAuthStore.getState().user?.attendancePolicyId || null,
            policySnapshot: null,
            punchInEvidence: lastPunchIn.payload.evidence || null,
            punchOutEvidence: null,
            createdAt: lastPunchIn.createdAt,
            updatedAt: lastPunchIn.createdAt,
            deletedAt: null
          } as AttendanceRecord;
        }

        if (lastPunchOut) {
          return null;
        }

        const cached = storage.getString('last_active_attendance_session');
        if (cached) {
          try {
            return JSON.parse(cached) as AttendanceRecord;
          } catch {
            return null;
          }
        }
        return null;
      }

      try {
        const res = await api.get<{ data: AttendanceRecord | null }>('/attendance/today');
        const record = res.data.data;
        if (record) {
          storage.set('last_active_attendance_session', JSON.stringify(record));
        } else {
          storage.remove('last_active_attendance_session');
        }
        return record;
      } catch {
        const cached = storage.getString('last_active_attendance_session');
        if (cached) {
          try {
            return JSON.parse(cached) as AttendanceRecord;
          } catch {
            return null;
          }
        }
        return null;
      }
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
  return useMutation<AttendanceRecord, Error, { latitude?: number; longitude?: number; evidence?: any } | void>({
    mutationFn: async (payload) => {
      const netInfoState = await NetInfo.fetch();
      const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

      const coords: any = (payload && 'latitude' in payload && payload.latitude !== 0)
        ? { latitude: payload.latitude, longitude: payload.longitude }
        : (isOnline ? (await getCurrentCoords()) : { latitude: 0, longitude: 0 });

      if (payload && 'evidence' in payload) {
        coords.evidence = payload.evidence;
      }

      if (!isOnline) {
        const localId = Math.random().toString(36).substring(7);
        const localRecord = {
          id: `local_${localId}`,
          userId: useAuthStore.getState().user?.id || '',
          companyId: useAuthStore.getState().user?.companyId || '',
          punchInTime: new Date().toISOString(),
          punchInLatitude: coords.latitude,
          punchInLongitude: coords.longitude,
          punchOutTime: null,
          punchOutLatitude: null,
          punchOutLongitude: null,
          workingHours: null,
          attendancePolicyId: useAuthStore.getState().user?.attendancePolicyId || null,
          policySnapshot: null,
          punchInEvidence: coords.evidence || null,
          punchOutEvidence: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        } as AttendanceRecord;

        enqueue('attendance', {
          localId,
          type: 'PUNCH_IN',
          payload: coords
        });

        storage.set('last_active_attendance_session', JSON.stringify(localRecord));

        return localRecord;
      }

      const res = await api.post<{ data: AttendanceRecord }>('/attendance/punch-in', coords);
      return res.data.data;
    },
    onSuccess: (data) => {
      storage.set('last_active_attendance_session', JSON.stringify(data));

      const punchInConfig = (data as any).policySnapshot?.punchInConfig;
      const policyRequiresGps = punchInConfig?.gps === 'REQUIRED' || punchInConfig?.gps === 'OPTIONAL';
      const userGpsEnabled = useAuthStore.getState().user?.isGpsTracked !== false;
      if (policyRequiresGps && userGpsEnabled) {
        startTracking(data.id);
      }
      qc.invalidateQueries({ queryKey: attendanceKeys.today });
      qc.invalidateQueries({ queryKey: attendanceKeys.history });
    }
  });
}

export function usePunchOut() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error, { latitude?: number; longitude?: number; evidence?: any } | void>({
    mutationFn: async (payload) => {
      const netInfoState = await NetInfo.fetch();
      const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

      const coords: any = (payload && 'latitude' in payload && payload.latitude !== 0)
        ? { latitude: payload.latitude, longitude: payload.longitude }
        : (isOnline ? (await getCurrentCoords()) : { latitude: 0, longitude: 0 });

      if (payload && 'evidence' in payload) {
        coords.evidence = payload.evidence;
      }

      if (!isOnline) {
        const localId = Math.random().toString(36).substring(7);
        enqueue('attendance', {
          localId,
          type: 'PUNCH_OUT',
          payload: coords
        });

        storage.remove('last_active_attendance_session');

        return {
          id: `local_${localId}`,
          userId: useAuthStore.getState().user?.id || '',
          companyId: useAuthStore.getState().user?.companyId || '',
          punchInTime: new Date().toISOString(),
          punchInLatitude: 0,
          punchInLongitude: 0,
          punchOutTime: new Date().toISOString(),
          punchOutLatitude: coords.latitude,
          punchOutLongitude: coords.longitude,
          workingHours: 0,
          attendancePolicyId: useAuthStore.getState().user?.attendancePolicyId || null,
          policySnapshot: null,
          punchInEvidence: null,
          punchOutEvidence: coords.evidence || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        } as AttendanceRecord;
      }

      const res = await api.post<{ data: AttendanceRecord }>('/attendance/punch-out', coords);
      return res.data.data;
    },
    onSuccess: async () => {
      storage.remove('last_active_attendance_session');

      await stopTracking();
      qc.invalidateQueries({ queryKey: attendanceKeys.today });
      qc.invalidateQueries({ queryKey: attendanceKeys.history });
    }
  });
}

export function useAttendancePolicies(companyId?: string, type?: string) {
  return useQuery<any[]>({
    queryKey: ['policies', companyId, type],
    queryFn: async () => {
      const params: string[] = [];
      if (companyId) params.push(`companyId=${companyId}`);
      if (type && type !== 'ALL') params.push(`type=${type}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const res = await api.get<{ data: any[] }>(`/policies${qs}`);
      return res.data.data;
    }
  });
}

export const usePolicies = useAttendancePolicies;

export function useAttendancePolicyDetail(id: string, companyId?: string) {
  return useQuery<any>({
    queryKey: ['policy', id, companyId],
    queryFn: async () => {
      const url = companyId ? `/policies/${id}?companyId=${companyId}` : `/policies/${id}`;
      const res = await api.get<{ data: any }>(url);
      return res.data.data;
    },
    enabled: !!id
  });
}

export function useAttendancePolicyAssignments(id: string, companyId?: string) {
  return useQuery<any>({
    queryKey: ['policy-assignments', id, companyId],
    queryFn: async () => {
      const url = companyId ? `/policies/${id}/assignments?companyId=${companyId}` : `/policies/${id}/assignments`;
      const res = await api.get<{ data: any }>(url);
      return res.data.data;
    },
    enabled: !!id
  });
}

export function useEffectiveAttendancePolicy(employeeId?: string, policyType: string = 'ATTENDANCE') {
  const cacheKey = `last_${policyType.toLowerCase()}_policy_${employeeId ?? 'self'}`;

  return useQuery<{
    source: 'USER' | 'DEPARTMENT' | 'DESIGNATION' | 'COMPANY' | 'SYSTEM';
    policyId: string | null;
    policyName: string;
    policyType?: string;
    config?: Record<string, unknown>;
    punchInConfig: any;
    punchOutConfig: any;
    regularizationConfig?: any;
  }>({
    queryKey: ['effective-policy', policyType, employeeId],
    retry: 2,
    queryFn: async () => {
      const params: string[] = [];
      if (employeeId) params.push(`employeeId=${employeeId}`);
      if (policyType) params.push(`type=${policyType}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `/policies/effective${qs}`;
      try {
        const res = await api.get<{ data: any }>(url);
        const policy = res.data.data;
        storage.set(cacheKey, JSON.stringify(policy));
        return policy;
      } catch (err) {
        const cached = storage.getString(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // fall through to throw
          }
        }
        throw err;
      }
    }
  });
}

export function useCreateAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: any }>('/policies', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['attendance-policies'] });
    }
  });
}

export function useUpdateAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation<any, Error, { id: string; payload: any }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<{ data: any }>(`/policies/${id}`, payload);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['policy', id] });
      qc.invalidateQueries({ queryKey: ['attendance-policies'] });
      qc.invalidateQueries({ queryKey: ['attendance-policy', id] });
      qc.invalidateQueries({ queryKey: ['effective-policy'] });
      qc.invalidateQueries({ queryKey: ['effective-attendance-policy'] });
    }
  });
}

export function useDeleteAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; companyId?: string }>({
    mutationFn: async ({ id, companyId }) => {
      const url = companyId ? `/policies/${id}?companyId=${companyId}` : `/policies/${id}`;
      await api.delete(url);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['attendance-policies'] });
      qc.invalidateQueries({ queryKey: ['effective-policy'] });
      qc.invalidateQueries({ queryKey: ['effective-attendance-policy'] });
    }
  });
}

export function useDuplicateAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation<any, Error, { id: string; companyId?: string }>({
    mutationFn: async ({ id, companyId }) => {
      const url = companyId ? `/policies/${id}/duplicate?companyId=${companyId}` : `/policies/${id}/duplicate`;
      const res = await api.post<{ data: any }>(url);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['attendance-policies'] });
    }
  });
}

export function useAssignAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation<void, Error, { policyId: string | null; policyType?: string; targetType: 'COMPANY' | 'DEPARTMENT' | 'DESIGNATION' | 'USER'; targetId: string; companyId?: string }>({
    mutationFn: async (payload) => {
      await api.post('/policies/assign', {
        policyType: 'ATTENDANCE',
        ...payload,
      });
    },
    onSuccess: (_, { targetId, targetType }) => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['attendance-policies'] });
      if (targetType === 'USER') {
        qc.invalidateQueries({ queryKey: ['user-detail', targetId] });
        qc.invalidateQueries({ queryKey: ['effective-policy', targetId] });
        qc.invalidateQueries({ queryKey: ['effective-attendance-policy', targetId] });
      }
      qc.invalidateQueries({ queryKey: ['effective-policy'] });
      qc.invalidateQueries({ queryKey: ['effective-attendance-policy'] });
    }
  });
}

export function useRegularizations(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return useQuery<any[], Error>({
    queryKey: ['regularizations', status],
    queryFn: async () => {
      const url = status ? `/attendance/regularization?status=${status}` : '/attendance/regularization';
      const res = await api.get<{ data: any[] }>(url);
      return res.data.data;
    }
  });
}

export function useSubmitRegularization() {
  const qc = useQueryClient();
  return useMutation<
    any,
    Error,
    {
      date: string;
      requestedPunchIn: string | null;
      requestedPunchOut: string | null;
      requestedPunchInOdometer?: number | null;
      requestedPunchOutOdometer?: number | null;
      reason: string;
    }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: any }>('/attendance/regularization', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regularizations'] });
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
    }
  });
}

export function useReviewRegularization() {
  const qc = useQueryClient();
  return useMutation<any, Error, { id: string; action: 'APPROVED' | 'REJECTED'; remarks: string | null }>({
    mutationFn: async ({ id, action, remarks }) => {
      const res = await api.post<{ data: any }>(`/attendance/regularization/${id}/review`, { action, remarks });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regularizations'] });
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
    }
  });
}

export function useBulkReviewRegularizations() {
  const qc = useQueryClient();
  return useMutation<any, Error, { ids: string[]; action: 'APPROVED' | 'REJECTED'; remarks: string | null }>({
    mutationFn: async (payload) => {
      const res = await api.post<{ data: any }>('/attendance/regularization/bulk-review', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regularizations'] });
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
    }
  });
}
