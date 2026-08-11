export interface GpsRoutePoint {
  id: string;
  userId: string;
  companyId: string;
  /** Links point to an attendance session when available. */
  attendanceId?: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  networkType: string | null;
  gpsProvider: string | null;
  isAccurate: boolean | null;
  recordedAt: string;
}

/** Route metadata returned by GET /api/v1/tracking/route */
export interface RouteData {
  points: GpsRoutePoint[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  averageSpeedMs: number;
  startTime: string | null;
  endTime: string | null;
}

export interface LiveLocationPoint {
  id: string;
  userId: string;
  /** Display name resolved from the user record. */
  userName: string;
  companyId?: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed?: number | null;
  batteryLevel: number | null;
  recordedAt: string;
  /** True when last update is older than 15 minutes. */
  isStale: boolean;
}

