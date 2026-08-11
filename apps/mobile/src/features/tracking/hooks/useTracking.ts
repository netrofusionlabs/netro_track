/**
 * Tracking hooks — GPS route query and live team locations.
 * Data contracts: docs/backend/api-reference.md + TrackingController.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { LiveLocationPoint, RouteData } from '../types';

export const trackingKeys = {
  route: (userId: string, date: string) => ['tracking', 'route', userId, date] as const,
  live: ['tracking', 'live'] as const,
};

/** Fetch a user's GPS route for a given date (route playback). */
export function useGpsRoute(userId: string, date: string) {
  return useQuery<RouteData>({
    queryKey: trackingKeys.route(userId, date),
    queryFn: async () => {
      const res = await api.get<{ data: RouteData }>('/tracking/route', {
        params: { userId, date },
      });
      const payload = res.data.data;

      const normalizePoints = (raw: RouteData['points'] | undefined): RouteData['points'] =>
        (raw ?? [])
          .map((p) => ({
            ...p,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            accuracy: p.accuracy == null ? null : Number(p.accuracy),
            speed: p.speed == null ? null : Number(p.speed),
            heading: p.heading == null ? null : Number(p.heading),
            altitude: p.altitude == null ? null : Number(p.altitude),
            attendanceId: p.attendanceId ?? null,
            recordedAt:
              typeof p.recordedAt === 'string'
                ? p.recordedAt
                : new Date(p.recordedAt as unknown as string).toISOString(),
          }))
          .filter(
            (p) =>
              Number.isFinite(p.latitude) &&
              Number.isFinite(p.longitude) &&
              !!p.recordedAt,
          )
          .sort(
            (a, b) =>
              new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
          );

      // Defensive: support older array-only payloads during migration
      if (Array.isArray(payload)) {
        const points = normalizePoints(payload);
        return {
          points,
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          averageSpeedMs: 0,
          startTime: points[0]?.recordedAt ?? null,
          endTime: points[points.length - 1]?.recordedAt ?? null,
        };
      }

      return {
        points: normalizePoints(payload?.points),
        totalDistanceMeters: payload?.totalDistanceMeters ?? 0,
        totalDurationSeconds: payload?.totalDurationSeconds ?? 0,
        averageSpeedMs: payload?.averageSpeedMs ?? 0,
        startTime: payload?.startTime ?? null,
        endTime: payload?.endTime ?? null,
      };
    },
    enabled: !!userId && !!date,
  });
}

/** Fetch the latest GPS point per team member (for manager live map). */
export function useLiveTeamLocations() {
  return useQuery<LiveLocationPoint[]>({
    queryKey: trackingKeys.live,
    queryFn: async () => {
      const res = await api.get<{ data: LiveLocationPoint[] }>('/tracking/live');
      const rows = res.data.data ?? [];
      // Backend LiveTeamMember may omit id — normalize for map adapters
      return rows.map((row) => ({
        ...row,
        id: row.id ?? `live-${row.userId}`,
        companyId: row.companyId ?? '',
        speed: row.speed ?? null,
      }));
    },
    refetchInterval: 30_000,
  });
}
