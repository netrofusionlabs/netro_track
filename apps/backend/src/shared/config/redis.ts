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

// ─── OrgChart 1-Hour Redis Cache Helpers ─────────────────────────────────────

const ORG_CHART_CACHE_TTL_SECONDS = 3600; // 1 Hour

export async function cacheOrgChartData(key: string, data: any): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(key, JSON.stringify(data), { EX: ORG_CHART_CACHE_TTL_SECONDS });
    }
  } catch (err) {
    logger.warn({ err, key }, 'Failed to write OrgChart Redis cache');
  }
}

export async function getCachedOrgChartData<T = any>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function invalidateOrgChartCache(companyId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const keys = await redis.keys(`orgchart:*:${companyId}*`);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info({ companyId, count: keys.length }, 'Flushed all OrgChart Redis keys for tenant');
    }
  } catch (err) {
    logger.warn({ err, companyId }, 'Failed to invalidate OrgChart cache');
  }
}

// ─── Dynamic Authorization & Permission Cache Helpers ─────────────────────────

const PERMISSION_CACHE_TTL_SECONDS = 300; // 5 Minutes

export async function cacheEffectivePermissions(
  companyId: string,
  userId: string,
  slugs: string[]
): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(
        `perms:effective:${companyId}:${userId}`,
        JSON.stringify(slugs),
        { EX: PERMISSION_CACHE_TTL_SECONDS }
      );
    }
  } catch (err) {
    logger.warn({ err, userId }, 'Failed to write permission Redis cache');
  }
}

export async function getCachedEffectivePermissions(
  companyId: string,
  userId: string
): Promise<string[] | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get(`perms:effective:${companyId}:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

export async function invalidateUserPermissionCache(
  companyId: string,
  userId: string
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`perms:effective:${companyId}:${userId}`);
    logger.info({ companyId, userId }, 'Invalidated effective permissions cache for user');
  } catch (err) {
    logger.warn({ err, userId }, 'Failed to invalidate user permission cache');
  }
}

export async function invalidateCompanyPermissionCache(companyId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const keys = await redis.keys(`perms:effective:${companyId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info({ companyId, count: keys.length }, 'Flushed all user permission Redis keys for tenant');
    }
  } catch (err) {
    logger.warn({ err, companyId }, 'Failed to invalidate company permission cache');
  }
}

