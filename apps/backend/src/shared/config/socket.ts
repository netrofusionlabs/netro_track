/**
 * Socket.IO server factory with Redis adapter for horizontal scaling.
 * In development (no REDIS_URL), the adapter is skipped and single-node mode is used.
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
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
}

/**
 * Initialise the Socket.IO server and attach it to the HTTP server.
 * Must be called once during app bootstrap.
 */
export async function initSocketServer(httpServer: HttpServer): Promise<SocketServer> {
  io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    // Path kept at default /socket.io
  });

  // ── Redis adapter (optional – skip if REDIS_URL is not configured) ──────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO: Redis adapter connected');
    } catch (err) {
      logger.warn({ err }, 'Socket.IO: Redis adapter failed — running in single-node mode');
    }
  } else {
    logger.info('Socket.IO: REDIS_URL not set — running in single-node mode');
  }

  // ── JWT authentication middleware ────────────────────────────────────────────
  io.use((socket, next) => {
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
  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info({ userId: user.id, role: user.role }, 'Socket connected');

    // Each user auto-joins their company room (for admin/manager broadcasts)
    void socket.join(`company:${user.companyId}`);
    // Each user joins their own private room (for targeted messages)
    void socket.join(`user:${user.id}`);

    /**
     * Employee → Server: broadcast location to manager room.
     * Event: 'location:update'
     * Payload: { latitude, longitude, accuracy?, speed?, heading?, battery?, networkType?, recordedAt }
     */
    socket.on('location:update', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;

      const update = {
        userId: user.id,
        companyId: user.companyId,
        ...(payload as object),
        serverTimestamp: new Date().toISOString()
      };

      // Broadcast to company room so managers/admins see it live
      socket.to(`company:${user.companyId}`).emit('location:employee', update);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: user.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO server initialised');
  return io;
}

/** Returns the initialised Socket.IO instance (throws if not yet initialised). */
export function getSocketServer(): SocketServer {
  if (!io) throw new Error('Socket.IO server not initialised');
  return io;
}
