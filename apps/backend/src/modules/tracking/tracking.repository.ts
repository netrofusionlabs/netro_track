import { prisma } from '../../shared/config/prisma';
import { GpsLocation } from '@prisma/client';

export interface GpsBatchItem {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  networkType?: string | null;
  recordedAt: Date;
  attendanceId?: string | null;
}

export class TrackingRepository {
  public async batchInsert(
    companyId: string,
    userId: string,
    points: GpsBatchItem[]
  ): Promise<number> {
    const result = await prisma.gpsLocation.createMany({
      data: points.map((p) => ({
        companyId,
        userId,
        attendanceId: p.attendanceId ?? null,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        battery: p.battery ?? null,
        networkType: p.networkType ?? null,
        recordedAt: p.recordedAt
      })),
      skipDuplicates: false
    });
    return result.count;
  }

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
        recordedAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { recordedAt: 'asc' }
    });
  }

  public async findLatestByUsers(
    companyId: string,
    userIds: string[]
  ): Promise<GpsLocation[]> {
    // Fetch the latest GPS point per user using a raw query for efficiency
    // Falls back to individual findFirst per user for Prisma compatibility
    const results: GpsLocation[] = [];

    for (const userId of userIds) {
      const latest = await prisma.gpsLocation.findFirst({
        where: { companyId, userId },
        orderBy: { recordedAt: 'desc' }
      });
      if (latest) results.push(latest);
    }

    return results;
  }
}
