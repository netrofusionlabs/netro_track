/**
 * Simple MMKV-backed offline queue.
 * Each action is stored as a JSON array under a namespaced key.
 * The sync engine (Phase 4) will drain this queue automatically.
 */
import { storage } from './storage';

export interface QueuedAction<T = unknown> {
  localId: string;      // UUID generated on device to prevent duplicate sync
  type: string;         // e.g. 'PUNCH_IN', 'CREATE_VISIT'
  payload: T;
  createdAt: string;    // ISO timestamp
}

function queueKey(namespace: string): string {
  return `offline_queue:${namespace}`;
}

export function enqueue<T>(namespace: string, item: Omit<QueuedAction<T>, 'createdAt'>): void {
  const key = queueKey(namespace);
  const existing = getQueue<T>(namespace);
  existing.push({ ...item, createdAt: new Date().toISOString() });
  storage.set(key, JSON.stringify(existing));
}

export function getQueue<T>(namespace: string): QueuedAction<T>[] {
  const key = queueKey(namespace);
  const raw = storage.getString(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedAction<T>[];
  } catch {
    return [];
  }
}

export function removeFromQueue(namespace: string, localId: string): void {
  const remaining = getQueue(namespace).filter((item) => item.localId !== localId);
  storage.set(queueKey(namespace), JSON.stringify(remaining));
}

export function clearQueue(namespace: string): void {
  storage.set(queueKey(namespace), JSON.stringify([]));
}
