/**
 * Socket.IO client for real-time live location updates.
 * Managers receive 'location:employee' events from field employees.
 */
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';
import { storage } from '../utils/storage';

let socket: Socket | null = null;

function getToken(): string | null {
  const raw = storage.getString('auth-store');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export interface LiveLocationUpdate {
  userId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  recordedAt?: string;
  serverTimestamp: string;
}

/** Connect to Socket.IO server (idempotent). */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getToken();
  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10
  });

  return socket;
}

/** Disconnect the socket (call on logout). */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Emit an employee location update to the server. */
export function emitLocationUpdate(point: Omit<LiveLocationUpdate, 'userId' | 'companyId' | 'serverTimestamp'>): void {
  if (!socket?.connected) return;
  socket.emit('location:update', point);
}

/** Returns the current socket instance (may be null if not connected). */
export function getSocket(): Socket | null {
  return socket;
}
