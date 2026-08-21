/**
 * TrackingService — business logic for GPS batch sync, live positions, and route playback.
 *
 * After each batch insert:
 *  1. Updates Redis cache (latest position) for sub-ms live reads
 *  2. Broadcasts via Socket.IO to the employee's manager team room
 *
 * Live positions read from Redis first; DB is the fallback (cache miss).
 */
import { TrackingRepository, GpsBatchItem, RouteMetadata } from './tracking.repository';
import { AppError } from '../../shared/errors/AppError';
import { prisma } from '../../shared/config/prisma';
import { GpsLocation, Role } from '@prisma/client';
import {
  cacheLatestGpsPoint,
  getCachedGpsPoint,
  CachedGpsPoint,
} from '../../shared/config/redis';
import { broadcastEmployeeLocation } from '../../shared/config/socket';

export interface LiveTeamMember {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  batteryLevel: number | null;
  recordedAt: string;
  isStale: boolean; // true when last update > 15 minutes ago
}

export class TrackingService {
  private trackingRepository = new TrackingRepository();

  // ─── GPS Batch Sync ─────────────────────────────────────────────────────────

  public async syncBatch(
    companyId: string,
    userId: string,
    points: GpsBatchItem[]
  ): Promise<number> {
    if (!points.length) {
      throw new AppError('EMPTY_BATCH', 'GPS batch must contain at least one point', 400);
    }
    if (points.length > 500) {
      throw new AppError('BATCH_TOO_LARGE', 'GPS batch cannot exceed 500 points per request', 400);
    }

    // Guard: reject sync for users who have GPS tracking disabled
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGpsTracked: true },
    });
    if (userRecord?.isGpsTracked === false) {
      throw new AppError('GPS_TRACKING_DISABLED', 'GPS tracking is not enabled for this user', 403);
    }

    // Collect candidate attendance IDs from client points to validate against DB
    const candidateAttIds = Array.from(
      new Set(points.map((p) => p.attendanceId).filter(Boolean) as string[])
    );

    let validAttIdMap = new Set<string>();
    if (candidateAttIds.length > 0) {
      const validAtts = await prisma.attendance.findMany({
        where: {
          id: { in: candidateAttIds },
          companyId,
          userId,
        },
        select: { id: true },
      });
      validAttIdMap = new Set(validAtts.map((a) => a.id));
    }

    // Resolve active punch for fallback
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, punchOutTime: null },
      select: { id: true },
    });

    const enrichedPoints: GpsBatchItem[] = points.map((p) => {
      let resolvedAttId: string | null = null;
      if (p.attendanceId && validAttIdMap.has(p.attendanceId)) {
        resolvedAttId = p.attendanceId;
      } else if (activePunch?.id) {
        resolvedAttId = activePunch.id;
      }

      return {
        ...p,
        attendanceId: resolvedAttId,
        recordedAt: p.recordedAt instanceof Date ? p.recordedAt : new Date(p.recordedAt),
      };
    });

    const count = await this.trackingRepository.batchInsert(companyId, userId, enrichedPoints);

    // ── Post-insert: update cache + broadcast ─────────────────────────────────
    if (count > 0) {
      // Find the chronologically latest point from the batch
      const latestPoint = enrichedPoints.reduce((best, p) =>
        p.recordedAt > best.recordedAt ? p : best
      );

      // 1. Cache latest position (5-min TTL) for fast live-map reads
      void cacheLatestGpsPoint(userId, {
        userId,
        latitude: latestPoint.latitude,
        longitude: latestPoint.longitude,
        accuracy: latestPoint.accuracy ?? null,
        batteryLevel: latestPoint.batteryLevel ?? null,
        recordedAt: latestPoint.recordedAt.toISOString(),
      });

      // 2. Broadcast to manager team room for real-time map updates
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { managerId: true },
      });

      broadcastEmployeeLocation(user?.managerId, companyId, {
        userId,
        latitude: latestPoint.latitude,
        longitude: latestPoint.longitude,
        accuracy: latestPoint.accuracy ?? null,
        batteryLevel: latestPoint.batteryLevel ?? null,
        recordedAt: latestPoint.recordedAt.toISOString(),
      });
    }

    return count;
  }

  // ─── Route Playback ─────────────────────────────────────────────────────────

  public async getRouteForDay(
    companyId: string,
    userId: string,
    dateStr?: string
  ): Promise<RouteMetadata> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(
      targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999
    );
    return this.trackingRepository.findRouteWithMetadata(companyId, userId, startOfDay, endOfDay);
  }

  // ─── Live Team Locations ────────────────────────────────────────────────────

  public async getLiveTeamLocations(
    companyId: string,
    requesterId: string,
    role: Role
  ): Promise<LiveTeamMember[]> {
    let userIds: string[];

    if (role === Role.COMPANY_ADMIN || role === Role.SUPER_ADMIN) {
      const users = await prisma.user.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (role === Role.MANAGER) {
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: requesterId, deletedAt: null },
        select: { id: true },
      });
      userIds = subordinates.map((u) => u.id);
    } else {
      throw new AppError('FORBIDDEN', 'Only managers and admins can view team locations', 403);
    }

    if (userIds.length === 0) return [];

    // Fetch user names for display
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, companyId, deletedAt: null },
      select: { id: true, name: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    // Read from Redis cache first; fall back to DB for cache misses
    const staleThresholdMs = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    const locations = await Promise.all(
      userIds.map(async (userId): Promise<LiveTeamMember | null> => {
        let point: CachedGpsPoint | null = await getCachedGpsPoint(userId);

        if (!point) {
          // Cache miss — query DB
          const dbPoint: GpsLocation | null = await prisma.gpsLocation.findFirst({
            where: { companyId, userId },
            orderBy: { recordedAt: 'desc' },
          });
          if (!dbPoint) return null;

          point = {
            userId,
            latitude: Number(dbPoint.latitude),
            longitude: Number(dbPoint.longitude),
            accuracy: dbPoint.accuracy != null ? Number(dbPoint.accuracy) : null,
            batteryLevel: dbPoint.batteryLevel ?? null,
            recordedAt: dbPoint.recordedAt.toISOString(),
          };

          // Repopulate cache
          void cacheLatestGpsPoint(userId, point);
        }

        const age = now - new Date(point.recordedAt).getTime();
        return {
          userId,
          userName: nameMap.get(userId) ?? 'Unknown',
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          batteryLevel: point.batteryLevel,
          recordedAt: point.recordedAt,
          isStale: age > staleThresholdMs,
        };
      })
    );

    return locations.filter((l): l is LiveTeamMember => l !== null);
  }
}
