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



// ─── Types ────────────────────────────────────────────────────────────────────

type ActionNamespace = 'visits' | 'sales' | 'inspections' | 'attendance';

interface ActionHandler {
  endpoint: string;
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
    endpoint: '/attendance',
    buildPayload: (p) => p,
  },
};

// ─── Queue Flusher ────────────────────────────────────────────────────────────

let isFlushing = false;

async function flushQueue(namespace: ActionNamespace): Promise<void> {
  const handler = ACTION_HANDLERS[namespace];
  const queue = getQueue(namespace);

  for (const item of queue) {
    try {
      await api.post(handler.endpoint, handler.buildPayload(item.payload));
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
    // Parallel flush all namespaces and GPS buffer
    await Promise.allSettled([
      syncGps(),
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
