/**
 * Socket.IO client for real-time live location updates and presence events.
 *
 * Features:
 * - JWT authentication on connect
 * - Auto-reconnect with exponential backoff
 * - Token expiry detection → refresh token → reconnect
 * - Employees emit 'location:update' for real-time manager map
 * - Managers listen for 'location:employee' and 'employee:status'
 */
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';
import { storage } from '../utils/storage';

let socket: Socket | null = null;

// ─── Token Helpers ────────────────────────────────────────────────────────────

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

function getRefreshToken(): string | null {
  const raw = storage.getString('auth-store');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { refreshToken?: string } };
    return parsed?.state?.refreshToken ?? null;
  } catch {
    return null;
  }
}

// ─── Event Payload Types ──────────────────────────────────────────────────────

export interface LiveLocationUpdate {
  userId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  networkType?: string;
  recordedAt?: string;
  serverTimestamp: string;
}

export interface EmployeeStatusUpdate {
  userId: string;
  status: 'WORKING' | 'OFFLINE';
  timestamp: string;
}

// ─── Connection Management ────────────────────────────────────────────────────

/** Connect to Socket.IO server (idempotent). */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getToken();
  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2_000,
    reconnectionDelayMax: 30_000,
    reconnectionAttempts: 20,
  });

  // ── Auth error: token may be expired ─────────────────────────────────────
  socket.on('connect_error', async (err: Error) => {
    const message = err.message.toLowerCase();
    if (message.includes('invalid') || message.includes('expired') || message.includes('unauthorized')) {
      console.warn('[socketService] Auth error — attempting token refresh');
      await handleTokenExpiry();
    }
  });

  socket.on('error', (err: Error) => {
    console.warn('[socketService] Socket error:', err.message);
  });

  socket.on('disconnect', (reason: string) => {
    console.info('[socketService] Disconnected:', reason);
  });

  return socket;
}

/** Disconnect the socket (call on logout). */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Reconnect with a new access token.
 * Called after a successful token refresh.
 */
export function reconnectWithNewToken(newToken: string): void {
  if (socket) {
    socket.auth = { token: newToken };
    socket.disconnect().connect();
  }
}

// ─── Token Refresh Handler ────────────────────────────────────────────────────

async function handleTokenExpiry(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn('[socketService] No refresh token — cannot reconnect');
    disconnectSocket();
    return;
  }

  try {
    // Dynamically import to avoid circular dependency
    const { api } = await import('./api');
    const response = await api.post<{ data: { accessToken: string } }>(
      '/auth/refresh-token',
      { refreshToken }
    );

    const newAccessToken = response.data.data.accessToken;

    // Update MMKV store with new token
    const raw = storage.getString('auth-store');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
        if (parsed.state) {
          parsed.state.accessToken = newAccessToken;
          storage.set('auth-store', JSON.stringify(parsed));
        }
      } catch {
        // Failed to update store — socket will not reconnect
      }
    }

    reconnectWithNewToken(newAccessToken);
    console.info('[socketService] Token refreshed — reconnecting socket');
  } catch (err) {
    console.warn('[socketService] Token refresh failed — disconnecting', err);
    disconnectSocket();
  }
}

// ─── Emit Helpers ─────────────────────────────────────────────────────────────

/** Emit an employee location update to the server (real-time map). */
export function emitLocationUpdate(
  point: Omit<LiveLocationUpdate, 'userId' | 'companyId' | 'serverTimestamp'>
): void {
  if (!socket?.connected) return;
  socket.emit('location:update', point);
}

/** Emit an attendance status change to the server. */
export function emitAttendanceStatus(status: 'WORKING' | 'OFFLINE'): void {
  if (!socket?.connected) return;
  socket.emit('attendance:status', { status });
}

// ─── Subscribe Helpers ────────────────────────────────────────────────────────

/** Subscribe to employee location updates (manager side). */
export function onEmployeeLocation(
  callback: (update: LiveLocationUpdate) => void
): () => void {
  const sock = getSocket();
  if (!sock) return () => {};
  sock.on('location:employee', callback);
  return () => sock.off('location:employee', callback);
}

/** Subscribe to employee status changes (manager side). */
export function onEmployeeStatus(
  callback: (update: EmployeeStatusUpdate) => void
): () => void {
  const sock = getSocket();
  if (!sock) return () => {};
  sock.on('employee:status', callback);
  return () => sock.off('employee:status', callback);
}

/** Returns the current socket instance (may be null if not connected). */
export function getSocket(): Socket | null {
  return socket;
}
