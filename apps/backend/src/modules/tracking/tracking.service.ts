import { TrackingRepository, GpsBatchItem } from './tracking.repository';
import { AppError } from '../../shared/errors/AppError';
import { prisma } from '../../shared/config/prisma';
import { GpsLocation, Role } from '@prisma/client';

export class TrackingService {
  private trackingRepository = new TrackingRepository();

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

    // Resolve attendanceId: find the active punch for this user today (if any)
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, punchOutTime: null }
    });

    const enrichedPoints = points.map((p) => ({
      ...p,
      attendanceId: p.attendanceId ?? activePunch?.id ?? null,
      recordedAt: new Date(p.recordedAt)
    }));

    return this.trackingRepository.batchInsert(companyId, userId, enrichedPoints);
  }

  public async getRouteForDay(
    companyId: string,
    userId: string,
    dateStr?: string
  ): Promise<GpsLocation[]> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    return this.trackingRepository.findByUserForDay(companyId, userId, startOfDay, endOfDay);
  }

  public async getLiveTeamLocations(
    companyId: string,
    requesterId: string,
    role: Role
  ): Promise<GpsLocation[]> {
    let userIds: string[];

    if (role === Role.COMPANY_ADMIN || role === Role.SUPER_ADMIN) {
      const users = await prisma.user.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true }
      });
      userIds = users.map((u) => u.id);
    } else if (role === Role.MANAGER) {
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: requesterId, deletedAt: null },
        select: { id: true }
      });
      userIds = [requesterId, ...subordinates.map((u) => u.id)];
    } else {
      throw new AppError('FORBIDDEN', 'Only managers and admins can view team locations', 403);
    }

    return this.trackingRepository.findLatestByUsers(companyId, userIds);
  }
}
