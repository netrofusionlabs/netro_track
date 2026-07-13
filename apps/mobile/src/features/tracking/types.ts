export interface GpsRoutePoint {
  id: string;
  userId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery: number | null;
  networkType: string | null;
  recordedAt: string;
}

export interface LiveLocationPoint {
  id: string;
  userId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  recordedAt: string;
}
