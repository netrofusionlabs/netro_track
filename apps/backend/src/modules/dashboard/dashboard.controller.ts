import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { DashboardService } from './dashboard.service';
import {
  dashboardSummaryQuerySchema,
  attendanceSummaryQuerySchema,
  salesSummaryQuerySchema,
  teamSummaryQuerySchema,
} from '@netrotrack/shared';

export class DashboardController {
  private dashboardService = new DashboardService();

  /** GET /api/v1/dashboard/summary */
  public getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { date } = dashboardSummaryQuerySchema.parse(req.query);

      const summary = await this.dashboardService.getSummary(companyId, date);
      res.status(200).json({
        success: true,
        message: 'Dashboard summary retrieved',
        data: summary,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/dashboard/attendance-summary */
  public getAttendanceSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate } = attendanceSummaryQuerySchema.parse(req.query);

      const summary = await this.dashboardService.getAttendanceSummary(companyId, startDate, endDate);
      res.status(200).json({
        success: true,
        message: 'Attendance summary retrieved',
        data: summary,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/dashboard/sales-summary */
  public getSalesSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate } = salesSummaryQuerySchema.parse(req.query);

      const summary = await this.dashboardService.getSalesSummary(companyId, startDate, endDate);
      res.status(200).json({
        success: true,
        message: 'Sales summary retrieved',
        data: summary,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/dashboard/team-summary */
  public getTeamSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const managerId = req.user!.id;
      const { date } = teamSummaryQuerySchema.parse(req.query);

      const summary = await this.dashboardService.getTeamSummary(companyId, managerId, date);
      res.status(200).json({
        success: true,
        message: 'Team summary retrieved',
        data: summary,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}
