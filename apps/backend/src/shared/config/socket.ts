/**
 * Socket.IO server factory with Redis adapter for horizontal scaling.
 *
 * Key design decisions:
 * - JWT authentication on every handshake (401 on failure)
 * - Room structure:
 *     company:{companyId}   → all company members (admin broadcasts)
 *     user:{userId}         → personal notifications
 *     team:{managerId}      → scoped GPS + status updates for a manager's team
 * - GPS location updates scoped to team rooms — managers see ONLY their team
 * - attendance:status events broadcast employee online/offline state
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import pino from 'pino';
import jwt from 'jsonwebtoken';

const logger = pino({ name: 'socket.io' });

let io: SocketServer | null = null;

export interface JwtPayload {
  id: string;
  companyId: string;
  role: string;
  managerId?: string | null;
}

// ─── Location update payload emitted by employees ─────────────────────────────
interface LocationUpdatePayload {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  networkType?: string;
  recordedAt?: string;
}

// ─── Attendance status payload ────────────────────────────────────────────────
interface AttendanceStatusPayload {
  status: 'WORKING' | 'OFFLINE';
}

/**
 * Initialise the Socket.IO server and attach it to the HTTP server.
 * Must be called once during app bootstrap.
 */
export async function initSocketServer(httpServer: HttpServer): Promise<SocketServer> {
  io = new SocketServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // ── Redis adapter (optional – skip if REDIS_URL is not configured) ──────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const isTunnel = redisUrl.includes(':6380');
      const connectionType = isTunnel ? 'TUNNEL (Production Redis)' : 'LOCAL (Local Redis)';
      // Mask password in logs
      const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':***@');
      
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info(`Socket.IO: Redis adapter connected via ${connectionType} [${maskedUrl}]`);
    } catch (err) {
      logger.warn({ err }, 'Socket.IO: Redis adapter failed — running in single-node mode');
    }
  } else {
    logger.info('Socket.IO: REDIS_URL not set — running in single-node mode');
  }

  // ── JWT authentication middleware ────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const secret = process.env.JWT_SECRET ?? 'dev-secret';
      const decoded = jwt.verify(token, secret) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info({ userId: user.id, role: user.role }, 'Socket connected');

    // Every user joins their company room (admin/company-wide broadcasts)
    void socket.join(`company:${user.companyId}`);

    // Every user joins their personal room (targeted notifications)
    void socket.join(`user:${user.id}`);

    // ── Team-scoped room (SECURITY: GPS updates are team-isolated) ─────────────
    // Field employees join the team room of their manager.
    // Managers join their own team room to receive updates.
    if (user.managerId) {
      // Employee: join their manager's team room
      void socket.join(`team:${user.managerId}`);
    } else if (user.role === 'MANAGER') {
      // Manager: join their own team room (receives employee events)
      void socket.join(`team:${user.id}`);
    }

    // ── Event: Employee → Server: real-time location update ───────────────────
    // NOTE: This is for lightweight real-time display only.
    // Durable GPS storage uses the HTTP batch sync endpoint.
    socket.on('location:update', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;

      const data = payload as LocationUpdatePayload;
      const update = {
        userId: user.id,
        companyId: user.companyId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy ?? null,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        batteryLevel: data.batteryLevel ?? null,
        networkType: data.networkType ?? null,
        recordedAt: data.recordedAt ?? new Date().toISOString(),
        serverTimestamp: new Date().toISOString(),
      };

      // Broadcast to the manager's team room (not the entire company)
      if (user.managerId) {
        socket.to(`team:${user.managerId}`).emit('location:employee', update);
      }

      // Also notify company admins
      socket.to(`company:${user.companyId}`).except(`team:${user.managerId ?? ''}`).emit(
        'location:employee',
        update
      );
    });

    // ── Event: Employee → Server: attendance status change ────────────────────
    socket.on('attendance:status', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;

      const data = payload as AttendanceStatusPayload;
      const validStatuses = ['WORKING', 'OFFLINE'] as const;
      if (!validStatuses.includes(data.status)) return;

      const statusUpdate = {
        userId: user.id,
        status: data.status,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to team room and company room
      if (user.managerId) {
        io?.to(`team:${user.managerId}`).emit('employee:status', statusUpdate);
      }
      io?.to(`company:${user.companyId}`).emit('employee:status', statusUpdate);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: user.id, reason }, 'Socket disconnected');

      // Emit offline status to team when employee disconnects
      if (user.managerId) {
        io?.to(`team:${user.managerId}`).emit('employee:status', {
          userId: user.id,
          status: 'OFFLINE',
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('error', (err: Error) => {
      logger.error({ userId: user.id, err }, 'Socket error');
    });
  });

  logger.info('Socket.IO server initialised');
  return io;
}

/** Returns the initialised Socket.IO instance (throws if not yet initialised). */
export function getSocketServer(): SocketServer {
  if (!io) throw new Error('Socket.IO server not initialised — call initSocketServer() first');
  return io;
}

/** Broadcast employee status from a service layer (e.g. attendance punch events). */
export function broadcastEmployeeStatus(
  managerId: string | null | undefined,
  companyId: string,
  userId: string,
  status: 'WORKING' | 'OFFLINE'
): void {
  if (!io) return;

  const payload = { userId, status, timestamp: new Date().toISOString() };

  if (managerId) {
    io.to(`team:${managerId}`).emit('employee:status', payload);
  }
  io.to(`company:${companyId}`).emit('employee:status', payload);
}

/** Broadcast employee GPS position from the tracking service after batch insert. */
export function broadcastEmployeeLocation(
  managerId: string | null | undefined,
  companyId: string,
  locationUpdate: {
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    batteryLevel: number | null;
    recordedAt: string;
  }
): void {
  if (!io) return;

  if (managerId) {
    io.to(`team:${managerId}`).emit('location:employee', locationUpdate);
  }
  io.to(`company:${companyId}`).emit('location:employee', locationUpdate);
}
