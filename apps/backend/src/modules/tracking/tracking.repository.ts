/**
 * TrackingRepository — data access layer for GPS location records.
 *
 * Key design decisions:
 * - skipDuplicates: true on batchInsert → idempotent re-sync (BR-G11, BR-SY03)
 * - localId (client UUID) is the deduplication key
 * - findLatestByUsers uses a single efficient query via groupBy emulation
 * - Route metadata (haversine distance, duration, avg speed) computed server-side
 */
import { prisma } from '../../shared/config/prisma';
import { GpsLocation } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GpsBatchItem {
  localId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  batteryLevel?: number | null;
  batteryCharging?: boolean | null;
  networkType?: string | null;
  gpsProvider?: string | null;
  isAccurate?: boolean | null;
  recordedAt: Date;
  attendanceId?: string | null;
}

export interface RouteMetadata {
  points: GpsLocation[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  averageSpeedMs: number;
  startTime: string | null;
  endTime: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class TrackingRepository {
  /**
   * Bulk-insert GPS points.
   * skipDuplicates: true ensures idempotency — re-syncing the same localId
   * will not create duplicate rows (BR-G11, BR-SY03).
   */
  public async batchInsert(
    companyId: string,
    userId: string,
    points: GpsBatchItem[]
  ): Promise<number> {
    const result = await prisma.gpsLocation.createMany({
      data: points.map((p) => ({
        localId: p.localId,
        companyId,
        userId,
        attendanceId: p.attendanceId ?? null,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        altitude: p.altitude ?? null,
        batteryLevel: p.batteryLevel ?? null,
        batteryCharging: p.batteryCharging ?? null,
        networkType: p.networkType ?? null,
        gpsProvider: p.gpsProvider ?? null,
        isAccurate: p.isAccurate ?? (p.accuracy != null ? p.accuracy <= 100 : null),
        recordedAt: p.recordedAt,
      })),
      skipDuplicates: true, // idempotent: skip if localId already exists
    });
    return result.count;
  }

  /** Fetch all GPS points for a user on a given day, ordered chronologically. */
  public async findByUserForDay(
    companyId: string,
    userId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<GpsLocation[]> {
    return prisma.gpsLocation.findMany({
      where: {
        companyId,
        userId,
        recordedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /** Fetch GPS points with route metadata (distance, duration, avg speed). */
  public async findRouteWithMetadata(
    companyId: string,
    userId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<RouteMetadata> {
    const points = await this.findByUserForDay(companyId, userId, startOfDay, endOfDay);

    if (points.length === 0) {
      return {
        points: [],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        averageSpeedMs: 0,
        startTime: null,
        endTime: null,
      };
    }

    let totalDistanceMeters = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistanceMeters += haversineMeters(
        Number(points[i - 1].latitude),
        Number(points[i - 1].longitude),
        Number(points[i].latitude),
        Number(points[i].longitude)
      );
    }

    const startTime = points[0].recordedAt.toISOString();
    const endTime = points[points.length - 1].recordedAt.toISOString();
    const totalDurationSeconds = Math.round(
      (points[points.length - 1].recordedAt.getTime() - points[0].recordedAt.getTime()) / 1000
    );
    const averageSpeedMs =
      totalDurationSeconds > 0 ? totalDistanceMeters / totalDurationSeconds : 0;

    return {
      points,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      totalDurationSeconds,
      averageSpeedMs: Math.round(averageSpeedMs * 100) / 100,
      startTime,
      endTime,
    };
  }

  /**
   * Fetch the single latest GPS point per user from the given list.
   * Uses individual findFirst queries — acceptable for small team sizes.
   * For large fleets (1000+ employees), replace with a raw SQL DISTINCT ON query.
   */
  public async findLatestByUsers(
    companyId: string,
    userIds: string[]
  ): Promise<GpsLocation[]> {
    if (userIds.length === 0) return [];

    const results = await Promise.all(
      userIds.map((userId) =>
        prisma.gpsLocation.findFirst({
          where: { companyId, userId },
          orderBy: { recordedAt: 'desc' },
        })
      )
    );

    return results.filter((r): r is GpsLocation => r !== null);
  }
}

// ─── Haversine distance formula ───────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
