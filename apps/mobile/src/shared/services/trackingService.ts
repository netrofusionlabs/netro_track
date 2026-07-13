/**
 * Background GPS tracking service.
 *
 * Architecture:
 *  - Uses @react-native-community/geolocation (bundled in RN, no extra install needed)
 *  - Android: A Headless JS task or watchPosition keeps tracking in the foreground service.
 *    The user must start a foreground service notification (configured in AndroidManifest).
 *  - iOS: Significant location changes + background mode "location" keep it alive.
 *
 * Usage:
 *   TrackingService.start()   → after punch-in
 *   TrackingService.stop()    → after punch-out
 *   TrackingService.sync()    → drain MMKV buffer to the API
 */
import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { appendGpsPoints, drainBuffer, GpsPoint, getBufferSize, getBufferedPoints } from '../utils/gpsBuffer';
import { api } from '../services/api';

const TRACKING_INTERVAL_MS = 30_000; // 30 s per Product Bible
const SYNC_BATCH_SIZE = 100;          // points per HTTP request
const SYNC_INTERVAL_MS = 150_000;    // sync every 2.5 minutes (between 2.5-5 min per AGENTS.md)

let watchId: number | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let isTracking = false;

function getPosition(): Promise<GeolocationResponse> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });
  });
}

async function capturePoint(): Promise<void> {
  try {
    const pos = await getPosition();
    const point: GpsPoint = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      speed: pos.coords.speed ?? undefined,
      heading: pos.coords.heading ?? undefined,
      recordedAt: new Date(pos.timestamp).toISOString()
    };
    appendGpsPoints([point]);
  } catch {
    // GPS unavailable — silently skip (offline scenario)
  }
}

async function syncToServer(): Promise<void> {
  const bufferSize = getBufferSize();
  if (bufferSize === 0) return;

  // Peek at batch (do not drain yet)
  const batch = getBufferedPoints().slice(0, Math.min(bufferSize, SYNC_BATCH_SIZE));

  try {
    await api.post('/tracking/sync', { points: batch });
    // Only drain after successful POST
    drainBuffer(batch.length);
  } catch {
    // Network unavailable — leave points in buffer for next sync window
  }
}

/**
 * Starts continuous GPS capture and periodic sync.
 * Safe to call multiple times — idempotent.
 */
export function startTracking(): void {
  if (isTracking) return;
  isTracking = true;

  // Immediate first capture
  void capturePoint();

  // watchPosition for continuous updates (best for background on iOS)
  watchId = Geolocation.watchPosition(
    (pos) => {
      const point: GpsPoint = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
        recordedAt: new Date(pos.timestamp).toISOString()
      };
      appendGpsPoints([point]);
    },
    () => { /* silent failure */ },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,     // metres — minimum movement to emit new point
      interval: TRACKING_INTERVAL_MS,
      fastestInterval: TRACKING_INTERVAL_MS,
      // iOS uses significantChanges: false by default with watchPosition
    }
  );

  // Periodic sync timer
  syncTimer = setInterval(() => {
    void syncToServer();
  }, SYNC_INTERVAL_MS);

  // Also sync when app comes to foreground from background
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      void syncToServer();
    }
  });
}

/**
 * Stops GPS tracking and clears timers.
 * Performs a final sync before stopping.
 */
export async function stopTracking(): Promise<void> {
  if (!isTracking) return;
  isTracking = false;

  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (syncTimer !== null) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  // Final sync
  await syncToServer();
}

/** Returns whether the tracking service is currently active. */
export function isTrackingActive(): boolean {
  return isTracking;
}

/** Returns the current GPS position as a one-shot read (for forms). */
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const pos = await getPosition();
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Manual sync — call when connectivity is restored. */
export async function syncNow(): Promise<void> {
  return syncToServer();
}
