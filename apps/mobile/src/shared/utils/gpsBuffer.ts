/**
 * GPS buffer backed by MMKV.
 * Points accumulate here while the device is offline or between sync windows.
 * The sync engine drains this buffer and POSTs to /api/v1/tracking/sync.
 */
import { storage } from './storage';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  networkType?: string;
  recordedAt: string; // ISO datetime string
}

const GPS_BUFFER_KEY = 'gps_buffer:points';
const MAX_BUFFER_SIZE = 2000; // guard against unbounded growth when offline for days

export function appendGpsPoints(points: GpsPoint[]): void {
  const existing = getBufferedPoints();
  const combined = [...existing, ...points];
  // Trim oldest points if buffer is too large
  const trimmed = combined.length > MAX_BUFFER_SIZE
    ? combined.slice(combined.length - MAX_BUFFER_SIZE)
    : combined;
  storage.set(GPS_BUFFER_KEY, JSON.stringify(trimmed));
}

export function getBufferedPoints(): GpsPoint[] {
  const raw = storage.getString(GPS_BUFFER_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GpsPoint[];
  } catch {
    return [];
  }
}

export function drainBuffer(count: number): GpsPoint[] {
  const all = getBufferedPoints();
  const batch = all.slice(0, count);
  const remaining = all.slice(count);
  storage.set(GPS_BUFFER_KEY, JSON.stringify(remaining));
  return batch;
}

export function clearGpsBuffer(): void {
  storage.set(GPS_BUFFER_KEY, JSON.stringify([]));
}

export function getBufferSize(): number {
  return getBufferedPoints().length;
}
