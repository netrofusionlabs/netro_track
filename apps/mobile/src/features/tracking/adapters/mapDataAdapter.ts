/**
 * Tracking → map adapters.
 *
 * Converts API / feature-local tracking shapes into generic MapMarker / MapRoute
 * data for NetroMap. Keeps MapLibre / NetroMap unaware of backend contracts.
 *
 * Contracts aligned with:
 * - docs/architecture/gps-tracking-architecture.md
 * - docs/backend/api-reference.md (GET /tracking/live, GET /tracking/route)
 * - backend TrackingService LiveTeamMember + RouteMetadata
 */

import type { MapMarker, MapRoute } from '../../../shared/types/map';
import { isValidCoordinate } from '../../../shared/utils/map/mapCoordinateUtils';
import type { GpsRoutePoint, LiveLocationPoint, RouteData } from '../types';

export interface LiveMarkerOptions {
  selectedUserId?: string | null;
  statusByUserId?: Record<string, 'WORKING' | 'OFFLINE' | undefined>;
}

export interface RouteFilterOptions {
  /** Prefer filtering by attendance session id when GPS points include it. */
  attendanceId?: string;
  /** Inclusive start of session window (ISO). */
  startAt?: string;
  /** Inclusive end of session window (ISO). Open-ended if omitted. */
  endAt?: string | null;
}

function resolveLiveStatus(
  point: LiveLocationPoint,
  statusByUserId?: LiveMarkerOptions['statusByUserId'],
): MapMarker['status'] {
  if (statusByUserId?.[point.userId] === 'OFFLINE') return 'offline';
  if (point.isStale) return 'stale';

  const ageMs = Date.now() - new Date(point.recordedAt).getTime();
  if (ageMs < 5 * 60 * 1000) return 'active';
  if (ageMs < 15 * 60 * 1000) return 'idle';
  return 'stale';
}

/** GET /tracking/live (+ socket merges) → MapMarker[] */
export function liveLocationsToMarkers(
  points: LiveLocationPoint[],
  options: LiveMarkerOptions = {},
): MapMarker[] {
  const markers: MapMarker[] = [];

  for (const point of points) {
    const coordinate = { latitude: point.latitude, longitude: point.longitude };
    if (!isValidCoordinate(coordinate)) continue;

    const selected = options.selectedUserId === point.userId;
    const status = selected ? 'selected' : resolveLiveStatus(point, options.statusByUserId);

    markers.push({
      id: point.id || `live-${point.userId}`,
      coordinate,
      title: point.userName || 'Agent',
      description: `Last seen ${new Date(point.recordedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      type: 'employee',
      status,
      accuracy: point.accuracy ?? undefined,
      label: undefined,
      metadata: {
        userId: point.userId,
        batteryLevel: point.batteryLevel,
        recordedAt: point.recordedAt,
        isStale: point.isStale,
      },
    });
  }

  return markers;
}

export interface RouteMapData {
  markers: MapMarker[];
  routes: MapRoute[];
  points: GpsRoutePoint[];
  meta: Pick<
    RouteData,
    'totalDistanceMeters' | 'totalDurationSeconds' | 'averageSpeedMs' | 'startTime' | 'endTime'
  >;
}

function normalizeRoutePayload(
  routeData: RouteData | GpsRoutePoint[] | null | undefined,
): RouteData {
  if (!routeData) {
    return {
      points: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      averageSpeedMs: 0,
      startTime: null,
      endTime: null,
    };
  }

  if (Array.isArray(routeData)) {
    return {
      points: routeData,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      averageSpeedMs: 0,
      startTime: routeData[0]?.recordedAt ?? null,
      endTime: routeData[routeData.length - 1]?.recordedAt ?? null,
    };
  }

  return {
    points: Array.isArray(routeData.points) ? routeData.points : [],
    totalDistanceMeters: routeData.totalDistanceMeters ?? 0,
    totalDurationSeconds: routeData.totalDurationSeconds ?? 0,
    averageSpeedMs: routeData.averageSpeedMs ?? 0,
    startTime: routeData.startTime ?? null,
    endTime: routeData.endTime ?? null,
  };
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeRouteMeta(points: GpsRoutePoint[]): RouteMapData['meta'] {
  if (points.length === 0) {
    return {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      averageSpeedMs: 0,
      startTime: null,
      endTime: null,
    };
  }

  let totalDistanceMeters = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalDistanceMeters += haversineMeters(
      { latitude: Number(points[i - 1].latitude), longitude: Number(points[i - 1].longitude) },
      { latitude: Number(points[i].latitude), longitude: Number(points[i].longitude) },
    );
  }

  const startTime = points[0].recordedAt;
  const endTime = points[points.length - 1].recordedAt;
  const totalDurationSeconds = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000),
  );
  const averageSpeedMs =
    totalDurationSeconds > 0 ? totalDistanceMeters / totalDurationSeconds : 0;

  return {
    totalDistanceMeters: Math.round(totalDistanceMeters),
    totalDurationSeconds,
    averageSpeedMs: Math.round(averageSpeedMs * 100) / 100,
    startTime,
    endTime,
  };
}

/** Filter day route points down to one attendance session. */
export function filterRoutePointsForSession(
  points: GpsRoutePoint[],
  filter?: RouteFilterOptions | null,
): GpsRoutePoint[] {
  if (!filter) return points;

  if (filter.attendanceId) {
    const byAttendance = points.filter((p) => p.attendanceId === filter.attendanceId);
    if (byAttendance.length > 0) return byAttendance;
  }

  if (!filter.startAt) return points;

  const startMs = new Date(filter.startAt).getTime();
  const endMs = filter.endAt ? new Date(filter.endAt).getTime() : Date.now();

  return points.filter((p) => {
    const t = new Date(p.recordedAt).getTime();
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  });
}

/**
 * GET /tracking/route → markers + routes for NetroMap.
 * Always draws the full path polyline. Optional cursor adds a playback marker.
 */
export function routeDataToMapData(
  routeData: RouteData | GpsRoutePoint[] | null | undefined,
  options: {
    cursorIndex?: number;
    routeId?: string;
    filter?: RouteFilterOptions | null;
  } = {},
): RouteMapData {
  const normalized = normalizeRoutePayload(routeData);
  const filtered = filterRoutePointsForSession(normalized.points, options.filter);
  const points = filtered.filter((p) =>
    isValidCoordinate({ latitude: Number(p.latitude), longitude: Number(p.longitude) }),
  );

  const coords = points.map((p) => ({
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
  }));

  const cursor =
    options.cursorIndex == null
      ? Math.max(coords.length - 1, 0)
      : Math.max(0, Math.min(options.cursorIndex, Math.max(coords.length - 1, 0)));

  const routes: MapRoute[] = [];
  const routeId = options.routeId ?? 'route';

  // Full path — always visible (fixes empty polyline when playback cursor is at start).
  // For unfiltered day views, split by attendanceId so gaps between sessions are not connected.
  if (!options.filter && points.some((p) => p.attendanceId)) {
    const groups = new Map<string, typeof coords>();
    for (let i = 0; i < points.length; i += 1) {
      const key = points[i].attendanceId ?? '__ungrouped__';
      const group = groups.get(key) ?? [];
      group.push(coords[i]);
      groups.set(key, group);
    }
    let segment = 0;
    for (const groupCoords of groups.values()) {
      if (groupCoords.length >= 2) {
        routes.push({
          id: `${routeId}-seg-${segment}`,
          coordinates: groupCoords,
          type: 'historical',
          title: 'Session path',
          color: '#1E40AF',
          width: 4.5,
        });
        segment += 1;
      }
    }
  } else if (coords.length >= 2) {
    routes.push({
      id: `${routeId}-full`,
      coordinates: coords,
      type: 'historical',
      title: 'Full path',
      color: '#1E40AF',
      width: 4.5,
    });
  }

  // Travelled highlight during playback
  if (cursor > 0 && coords.length >= 2) {
    const travelled = coords.slice(0, cursor + 1);
    if (travelled.length >= 2) {
      routes.push({
        id: `${routeId}-travelled`,
        coordinates: travelled,
        type: 'travelled',
        title: 'Travelled',
        color: '#059669',
        width: 5,
      });
    }
  }

  const markers: MapMarker[] = [];
  if (coords.length > 0) {
    markers.push({
      id: `${options.routeId ?? 'route'}-start`,
      coordinate: coords[0],
      type: 'start',
      title: 'Start',
      description: points[0]?.recordedAt
        ? new Date(points[0].recordedAt).toLocaleTimeString()
        : undefined,
    });
  }
  if (coords.length > 1) {
    markers.push({
      id: `${options.routeId ?? 'route'}-end`,
      coordinate: coords[coords.length - 1],
      type: 'end',
      title: 'End',
      description: points[points.length - 1]?.recordedAt
        ? new Date(points[points.length - 1].recordedAt).toLocaleTimeString()
        : undefined,
    });
  }
  if (coords.length > 0 && cursor > 0 && cursor < coords.length - 1) {
    markers.push({
      id: `${options.routeId ?? 'route'}-cursor`,
      coordinate: coords[cursor],
      type: 'current',
      title: `${cursor + 1} / ${coords.length}`,
      description: points[cursor]?.recordedAt
        ? new Date(points[cursor].recordedAt).toLocaleTimeString()
        : undefined,
      status: 'selected',
    });
  }

  const computed = computeRouteMeta(points);
  const meta = options.filter
    ? computed
    : {
        totalDistanceMeters: normalized.totalDistanceMeters || computed.totalDistanceMeters,
        totalDurationSeconds: normalized.totalDurationSeconds || computed.totalDurationSeconds,
        averageSpeedMs: normalized.averageSpeedMs || computed.averageSpeedMs,
        startTime: normalized.startTime ?? computed.startTime,
        endTime: normalized.endTime ?? computed.endTime,
      };

  return {
    markers,
    routes,
    points,
    meta,
  };
}

/** Punch-in / punch-out coordinate → single marker. */
export function punchLocationToMarker(
  coordinate: { latitude: number; longitude: number } | null | undefined,
  kind: 'punch-in' | 'punch-out',
): MapMarker | null {
  if (!coordinate || !isValidCoordinate(coordinate)) return null;
  return {
    id: kind,
    coordinate,
    type: 'punch',
    title: kind === 'punch-in' ? 'Punch In' : 'Punch Out',
    status: kind === 'punch-in' ? 'active' : 'selected',
  };
}
