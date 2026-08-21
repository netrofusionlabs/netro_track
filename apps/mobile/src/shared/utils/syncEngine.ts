/**
 * syncEngine — Offline sync orchestrator.
 *
 * Subscribes to:
 *  - NetInfo connectivity changes → flush queues on reconnect
 *  - AppState changes → flush queues when app comes to foreground
 *
 * Handles these queues:
 *  - GPS buffer (gps_buffer:points) → gpsSyncService.syncNow()
 *  - Offline action queues (visits, sales, inspections, attendance)
 *    → processes each action type, POSTs to backend, removes on success
 *
 * Call startSyncEngine() once at app launch (e.g., in App.tsx useEffect).
 */
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncNow as syncGps } from '../services/trackingService';
import { getQueue, removeFromQueue } from './offlineQueue';
import { api } from '../services/api';
import { useAuthStore } from '../../features/auth/stores/authStore';

/** Returns true only when the logged-in user has GPS tracking enabled. */
function isGpsTrackingEnabled(): boolean {
  return useAuthStore.getState().user?.isGpsTracked !== false;
}



// ─── Types ────────────────────────────────────────────────────────────────────

type ActionNamespace = 'visits' | 'sales' | 'inspections' | 'attendance';

interface ActionHandler {
  endpoint: string | ((payload: any, type?: string) => string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildPayload: (payload: any) => unknown;
}

// ─── Action Endpoint Map ──────────────────────────────────────────────────────

const ACTION_HANDLERS: Record<ActionNamespace, ActionHandler> = {
  visits: {
    endpoint: '/visits',
    buildPayload: (p) => p,
  },
  sales: {
    endpoint: '/sales',
    buildPayload: (p) => p,
  },
  inspections: {
    endpoint: '/inspections',
    buildPayload: (p) => p,
  },
  attendance: {
    endpoint: (p: any, type?: string) => {
      if (type === 'PUNCH_IN') return '/attendance/punch-in';
      if (type === 'PUNCH_OUT') return '/attendance/punch-out';
      return '/attendance/regularization';
    },
    buildPayload: (p) => p,
  },
};

// ─── Queue Flusher ────────────────────────────────────────────────────────────

async function uploadLocalFile(uri: string, userId: string): Promise<{ publicUrl: string; fileKey: string }> {
  // 1. Request presigned upload URL
  const res = await api.post('/uploads/presigned-url', {
    purpose: 'attendance',
    contentType: 'image/jpeg',
    entityId: userId,
  });
  const { uploadUrl, publicUrl, fileKey } = res.data.data;

  // 2. Resolve URI to a local Blob in React Native
  const localResponse = await fetch(uri);
  const blob = await localResponse.blob();

  // 3. Upload file to Cloudflare R2
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.send(blob);
  });

  return { publicUrl, fileKey };
}

async function uploadPayloadPhotos(evidence: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
  const updatedEvidence = { ...evidence };
  for (const [key, value] of Object.entries(updatedEvidence)) {
    if (typeof value === 'string' && (value.startsWith('file://') || value.startsWith('/') || value.startsWith('content://'))) {
      try {
        console.info(`[syncEngine] Uploading local photo for ${key}: ${value}`);
        const { publicUrl } = await uploadLocalFile(value, userId);
        updatedEvidence[key] = publicUrl;
        console.info(`[syncEngine] Uploaded local photo for ${key}. URL: ${publicUrl}`);
      } catch (err) {
        console.warn(`[syncEngine] Failed to upload local photo for ${key}:`, err);
        throw err;
      }
    }
  }
  return updatedEvidence;
}

let isFlushing = false;

async function flushQueue(namespace: ActionNamespace): Promise<void> {
  const handler = ACTION_HANDLERS[namespace];
  const queue = getQueue(namespace);

  for (const item of queue) {
    try {
      let payload = item.payload;
      if (payload && typeof payload === 'object' && 'evidence' in payload && payload.evidence) {
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        const uploadedEvidence = await uploadPayloadPhotos(payload.evidence as Record<string, unknown>, userId);
        payload = {
          ...payload,
          evidence: uploadedEvidence
        };
      }

      const endpoint = typeof handler.endpoint === 'function'
        ? handler.endpoint(payload, item.type)
        : handler.endpoint;
      await api.post(endpoint, handler.buildPayload(payload));
      removeFromQueue(namespace, item.localId);
      console.info(`[syncEngine] Synced ${namespace} action`, { localId: item.localId });
    } catch (error) {
      // Stop flushing this namespace on first failure — preserve ordering
      console.warn(`[syncEngine] Failed to sync ${namespace}`, error);
      break;
    }
  }
}

export async function flushAllQueues(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    // Parallel flush all namespaces; only sync GPS if tracking is enabled for this user
    await Promise.allSettled([
      isGpsTrackingEnabled() ? syncGps() : Promise.resolve(),
      flushQueue('attendance'),
      flushQueue('visits'),
      flushQueue('sales'),
      flushQueue('inspections'),
    ]);
  } finally {
    isFlushing = false;
  }
}

// ─── Engine Startup ───────────────────────────────────────────────────────────

let netInfoUnsubscribe: (() => void) | null = null;
let isEngineRunning = false;

/**
 * Start the sync engine.
 * Call once at app bootstrap. Safe to call multiple times (idempotent).
 */
export function startSyncEngine(): void {
  if (isEngineRunning) return;
  isEngineRunning = true;

  // 1. NetInfo: flush when connectivity restored
  netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected === true) {
      void flushAllQueues().catch(() => {});
    }
  });

  // 2. AppState: flush when app comes to foreground
  AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      void flushAllQueues().catch(() => {});
    }
  });

  // 3. Initial flush on start
  void flushAllQueues().catch(() => {});

  console.info('[syncEngine] Started');
}

/**
 * Stop the sync engine.
 * Usually only needed in tests or app teardown.
 */
export function stopSyncEngine(): void {
  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;
  isEngineRunning = false;
  console.info('[syncEngine] Stopped');
}
