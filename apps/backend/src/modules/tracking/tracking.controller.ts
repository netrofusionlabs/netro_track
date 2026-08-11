import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { TrackingService } from './tracking.service';
import { gpsBatchSyncSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

export class TrackingController {
  private trackingService = new TrackingService();

  /**
   * POST /api/v1/tracking/sync
   * Employee syncs a batch of GPS points accumulated in MMKV.
   * Idempotent — duplicate localId values are silently skipped.
   */
  public syncBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = gpsBatchSyncSchema.parse(req.body);

      const points = validated.points.map((p) => ({
        ...p,
        recordedAt: new Date(p.recordedAt),
        batteryLevel: p.batteryLevel,
        batteryCharging: p.batteryCharging,
        gpsProvider: p.gpsProvider,
        isAccurate: p.isAccurate,
        altitude: p.altitude,
      }));

      const count = await this.trackingService.syncBatch(companyId, userId, points);

      res.status(200).json({
        success: true,
        message: `${count} GPS point(s) synced successfully`,
        data: { synced: count },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/tracking/route?userId=&date=
   * Manager/Admin fetches a user's GPS route for a given date with metadata.
   */
  public getRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const targetUserId = (req.query.userId as string) || req.user!.id;
      const dateStr = req.query.date as string | undefined;

      const routeData = await this.trackingService.getRouteForDay(companyId, targetUserId, dateStr);

      res.status(200).json({
        success: true,
        message: 'Route data retrieved',
        data: routeData,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/tracking/live
   * Manager/Admin fetches the latest GPS point per team member.
   * Reads from Redis cache; DB is fallback on cache miss.
   */
  public getLiveLocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role as Role;

      const locations = await this.trackingService.getLiveTeamLocations(companyId, userId, role);

      res.status(200).json({
        success: true,
        message: 'Live team locations retrieved',
        data: locations,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}
