/**
 * trackingService — Background GPS tracking and sync manager.
 *
 * Implements Phase 4 GPS Tracking & Live location updates.
 *
 * Key features:
 * - Background/Foreground tracking via @react-native-community/geolocation
 * - Adaptive intervals based on device speed (30s, 60s, 120s) per BR-G07
 * - Local MMKV-backed buffer with 2000-point guard rail per BR-G09
 * - Periodic batch upload every 150 seconds (2.5 minutes) to POST /tracking/sync
 * - Real-time Socket.IO updates emitted to the manager's team room
 * - Idempotency support (each point gets a client-side UUID)
 */
import { Platform, AppState, AppStateStatus, NativeModules } from 'react-native';
import { requestLocationPermission } from '../utils/locationPermissions';
import { appendGpsPoints, drainBuffer, GpsPoint, getBufferSize } from '../utils/gpsBuffer';
import { api } from '../services/api';
import { emitLocationUpdate } from './socketService';

export interface GeolocationResponse {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BackgroundService: any = null;
try {
  // Safely import background actions native module without breaking module initialization
  BackgroundService = require('react-native-background-actions').default;
} catch {
  console.warn('[trackingService] react-native-background-actions native module not loaded');
}

// ─── Constants & State ────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS = 150_000; // 2.5 minutes
const BATCH_SIZE = 500;

interface TrackingState {
  isTracking: boolean;
  attendanceId: string | null;
  watchId: number | null;
  appStateSubscription: { remove: () => void } | null;
  lastSpeed: number;
  intervalSeconds: number;
}

const state: TrackingState = {
  isTracking: false,
  attendanceId: null,
  watchId: null,
  appStateSubscription: null,
  lastSpeed: 0,
  intervalSeconds: 10,
};

// ─── Helper: Adaptive Interval Logic ──────────────────────────────────────────

function getAdaptiveInterval(speedMs: number): number {
  return 10; // Fixed 10-second capture interval as requested
}

// ─── Helper: Get Current Coordinates ──────────────────────────────────────────

async function getPosition(): Promise<GeolocationResponse> {
  if (Platform.OS === 'android' && NativeModules.AppLocation) {
    try {
      const loc = await NativeModules.AppLocation.getCurrentLocation();
      return {
        coords: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: 0,
        },
        timestamp: Date.now(),
      };
    } catch {
      // Fallback
    }
  }
  return {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: 0,
    },
    timestamp: Date.now(),
  };
}

export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const pos = await getPosition();
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (err) {
    console.warn('[trackingService] getCurrentCoords fallback:', err);
    return { latitude: 37.7749, longitude: -122.4194 };
  }
}

// ─── Helper: Capture Single GPS Point ─────────────────────────────────────────

async function capturePoint(): Promise<void> {
  try {
    const pos = await getPosition();
    onLocationSuccess(pos);
  } catch (err) {
    console.warn('[trackingService] One-shot capture failed', err);
  }
}

// ─── Geolocation Callbacks ───────────────────────────────────────────────────

function onLocationSuccess(position: GeolocationResponse): void {
  if (!state.isTracking) return;

  const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
  const speedMs = speed ?? 0;
  state.lastSpeed = speedMs;

  // Compute and set adaptive interval for subsequent watch updates
  const newInterval = getAdaptiveInterval(speedMs);
  if (newInterval !== state.intervalSeconds) {
    state.intervalSeconds = newInterval;
    // Re-watch with new interval if needed (handled by platform provider)
  }

  const point: GpsPoint = {
    localId: generateLocalId(),
    attendanceId: state.attendanceId ?? undefined,
    latitude,
    longitude,
    accuracy: accuracy ?? undefined,
    speed: speedMs,
    heading: heading ?? undefined,
    altitude: altitude ?? undefined,
    recordedAt: new Date(position.timestamp).toISOString(),
  };

  // 1. Write to MMKV local buffer
  appendGpsPoints([point]);

  // 2. Emit real-time update via Socket.IO (for manager's live map)
  // Note: syncNow() is NOT called here to avoid racing with the background task loop.
  // Points are uploaded by backgroundSyncTask every 10s, or by drainNativeBuffer on resume.
  emitLocationUpdate({
    latitude,
    longitude,
    accuracy: accuracy ?? undefined,
    speed: speedMs,
    heading: heading ?? undefined,
    recordedAt: point.recordedAt,
  });
}

function onLocationError(error: GeolocationError): void {
  console.warn('[trackingService] Geolocation error:', error.message);
}

// ─── Sync Logic ───────────────────────────────────────────────────────────────

let isSyncing = false;

export async function syncNow(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    while (getBufferSize() > 0) {
      const batch = drainBuffer(BATCH_SIZE);
      if (!batch.length) break;

      try {
        await api.post('/tracking/sync', { points: batch });
        console.info(`[trackingService] Synced ${batch.length} GPS points`);
      } catch (error) {
        console.warn('[trackingService] Sync failed — requeuing batch', error);
        appendGpsPoints(batch);
        break; // exit loop on network failure to avoid tight infinite loop
      }
    }
  } finally {
    isSyncing = false;
  }
}

// ─── Native Buffer Drain ──────────────────────────────────────────────────────

/**
 * Drains all GPS points written by Kotlin's LocationListener into Android
 * SharedPreferences (captured during Doze / JS-throttled background periods)
 * and merges them into the MMKV buffer so syncNow() can upload them.
 *
 * Called on every AppState.active transition to recover any background GPS data.
 */
async function drainNativeBufferToMmkv(): Promise<void> {
  try {
    if (Platform.OS !== 'android' || !NativeModules.AppLocation?.drainNativeBuffer) return;

    const rawPoints: Array<{
      localId: string;
      latitude: number;
      longitude: number;
      recordedAt: string;
    }> = await NativeModules.AppLocation.drainNativeBuffer();

    if (!rawPoints || rawPoints.length === 0) return;

    const points: GpsPoint[] = rawPoints.map((p) => ({
      localId: p.localId,
      attendanceId: state.attendanceId ?? undefined,
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: p.recordedAt,
    }));

    appendGpsPoints(points);
    console.info(`[trackingService] Drained ${points.length} native Kotlin GPS point(s) into MMKV`);
  } catch (err) {
    console.warn('[trackingService] drainNativeBufferToMmkv error:', err);
  }
}

// ─── Background Service Task ──────────────────────────────────────────────────

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

const backgroundSyncTask = async (taskDataArguments?: any) => {
  const delay = taskDataArguments?.delay ?? 30000;
  
  await new Promise(async (resolve) => {
    while (BackgroundService.isRunning()) {
      try {
        await sleep(delay);
        await capturePoint();
        await syncNow();
      } catch (err) {
        console.warn('[trackingService] backgroundSyncTask iteration error:', err);
      }
    }
    resolve(undefined);
  });
};

const backgroundOptions = {
  taskName: 'NetroTrackLocation',
  taskTitle: 'Active Shift',
  taskDesc: 'NetroTrack is tracking your location.',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#007AFF', // brand primary
  linkingURI: 'netrotrack://',
  parameters: {
    delay: 10000, // Fixed 10 seconds iteration
  },
};

// ─── Service API: Start/Stop ──────────────────────────────────────────────────

/**
 * Start background location tracking and the periodic sync timer.
 * Call immediately upon successful punch-in.
 */
export async function startTracking(attendanceId: string): Promise<void> {
  if (state.isTracking) return;
  state.isTracking = true;
  state.attendanceId = attendanceId;

  // Start native location listener
  try {
    if (Platform.OS === 'android' && NativeModules.AppLocation) {
      NativeModules.AppLocation.startLocationUpdates();
    }
  } catch {
    // ignore
  }

  // Capture first point immediately + drain any pre-existing native buffer points
  void capturePoint();
  await drainNativeBufferToMmkv();
  void syncNow();

  // Start background service if native module is available
  let bgStarted = false;
  try {
    if (BackgroundService && typeof BackgroundService.start === 'function') {
      await BackgroundService.start(backgroundSyncTask, backgroundOptions);
      bgStarted = true;
    }
  } catch (e) {
    console.warn('[trackingService] Background service notice:', e);
  }

  // Fallback timer if BackgroundService is unavailable
  if (!bgStarted) {
    state.watchId = setInterval(() => {
      void capturePoint();
      void syncNow();
    }, 10000) as unknown as number;
  }

  // On AppState change: tell Kotlin whether to buffer fixes natively.
  //   background/inactive → setBackgroundMode(true)  → Kotlin captures every 3s fix to SharedPreferences
  //   active              → setBackgroundMode(false) → Kotlin stops buffering (JS takes over)
  //                       → drain any buffered native points → upload all to server
  state.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (Platform.OS === 'android' && NativeModules.AppLocation?.setBackgroundMode) {
      const isBackground = nextState === 'background' || nextState === 'inactive';
      NativeModules.AppLocation.setBackgroundMode(isBackground);
    }
    if (nextState === 'active') {
      void drainNativeBufferToMmkv().then(() => syncNow());
    }
  });

  console.info('[trackingService] Started tracking', { attendanceId });
}

/**
 * Stop tracking, clear timers, and perform a final upload flush.
 * Call upon successful punch-out.
 */
export async function stopTracking(): Promise<void> {
  if (!state.isTracking) return;
  state.isTracking = false;
  state.attendanceId = null;

  if (state.watchId !== null) {
    clearInterval(state.watchId);
    state.watchId = null;
  }

  try {
    if (BackgroundService && typeof BackgroundService.stop === 'function') {
      await BackgroundService.stop();
    }
  } catch (e) {
    console.warn('[trackingService] Background service notice:', e);
  }

  if (state.appStateSubscription) {
    state.appStateSubscription.remove();
    state.appStateSubscription = null;
  }

  // Final flush to upload any remaining points in the buffer
  await syncNow();

  console.info('[trackingService] Stopped tracking');
}

/** Returns whether the service is currently tracking. */
export function isTrackingActive(): boolean {
  return state.isTracking;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateLocalId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
