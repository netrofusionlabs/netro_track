/**
 * Tracking hooks — GPS route query and live team locations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import type { GpsRoutePoint, LiveLocationPoint } from '../types';

export const trackingKeys = {
  route: (userId: string, date: string) => ['tracking', 'route', userId, date] as const,
  live: ['tracking', 'live'] as const
};

/** Fetch a user's GPS route for a given date (route playback). */
export function useGpsRoute(userId: string, date: string) {
  return useQuery<GpsRoutePoint[]>({
    queryKey: trackingKeys.route(userId, date),
    queryFn: async () => {
      const res = await api.get<{ data: GpsRoutePoint[] }>('/tracking/route', {
        params: { userId, date }
      });
      return res.data.data;
    },
    enabled: !!userId && !!date
  });
}

/** Fetch the latest GPS point per team member (for manager live map). */
export function useLiveTeamLocations() {
  return useQuery<LiveLocationPoint[]>({
    queryKey: trackingKeys.live,
    queryFn: async () => {
      const res = await api.get<{ data: LiveLocationPoint[] }>('/tracking/live');
      return res.data.data;
    },
    refetchInterval: 30_000 // re-fetch every 30s as a fallback to sockets
  });
}
