/**
 * Redis client singleton (using the standard 'redis' package from package.json).
 *
 * Provides a single shared client for:
 *  - GPS latest-position cache (gps:latest:{userId})
 *  - Session invalidation events
 *
 * Usage:
 *   import { getRedis } from './redis';
 *   const redis = getRedis();
 *   if (redis) {
 *     await redis.set('key', 'value', { EX: 300 });
 *   }
 */
import { createClient } from 'redis';
import pino from 'pino';

const logger = pino({ name: 'redis' });

// We define a type that represents the client returned by createClient
type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let isConnected = false;

/** Returns the shared Redis client, creating it lazily on first call. */
export function getRedis(): RedisClient | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (client) return client;

  client = createClient({ url });

  client.on('connect', () => logger.info('Redis client connecting'));
  client.on('ready', () => {
    isConnected = true;
    logger.info('Redis client ready');
  });
  client.on('error', (err: Error) => {
    isConnected = false;
    logger.error({ err }, 'Redis client error');
  });
  client.on('end', () => {
    isConnected = false;
    logger.warn('Redis client connection ended');
  });

  // Start the connection in background (node-redis requires connect() to be called)
  client.connect().catch((err: Error) => {
    logger.error({ err }, 'Failed to connect to Redis');
  });

  return client;
}

/** Gracefully close the Redis connection (call on process exit). */
export async function closeRedis(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch (err) {
      logger.error({ err }, 'Error during Redis disconnect');
    }
    client = null;
    isConnected = false;
    logger.info('Redis client closed');
  }
}

// ─── GPS cache helpers ────────────────────────────────────────────────────────

const GPS_CACHE_TTL_SECONDS = 300; // 5 minutes

export interface CachedGpsPoint {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  batteryLevel: number | null;
  recordedAt: string;
}

/** Cache the latest GPS position for a user. TTL = 5 minutes. */
export async function cacheLatestGpsPoint(
  userId: string,
  point: CachedGpsPoint
): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(
        `gps:latest:${userId}`,
        JSON.stringify(point),
        { EX: GPS_CACHE_TTL_SECONDS }
      );
    }
  } catch (err) {
    // Non-fatal — fall back to DB query
    logger.warn({ err, userId }, 'Failed to write GPS cache');
  }
}

/** Read the latest GPS position for a user from cache. Returns null on miss. */
export async function getCachedGpsPoint(userId: string): Promise<CachedGpsPoint | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get(`gps:latest:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedGpsPoint;
  } catch {
    return null;
  }
}
