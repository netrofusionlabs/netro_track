import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { ReportService } from './report.service';
import {
  attendanceReportQuerySchema,
  visitsReportQuerySchema,
  salesReportQuerySchema,
} from '@netrotrack/shared';

export class ReportController {
  private reportService = new ReportService();

  /** GET /api/v1/reports/attendance */
  public getAttendanceReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role;
      const { startDate, endDate, userId } = attendanceReportQuerySchema.parse(req.query);

      // Field employees can only see their own reports
      const effectiveUserId =
        role === 'FIELD_EMPLOYEE' ? req.user!.id : userId;

      const report = await this.reportService.getAttendanceReport(
        companyId,
        startDate,
        endDate,
        effectiveUserId
      );

      res.status(200).json({
        success: true,
        message: 'Attendance report generated',
        data: report,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/reports/visits */
  public getVisitsReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role;
      const { startDate, endDate, userId, customerId } = visitsReportQuerySchema.parse(req.query);

      const effectiveUserId =
        role === 'FIELD_EMPLOYEE' ? req.user!.id : userId;

      const report = await this.reportService.getVisitsReport(
        companyId,
        startDate,
        endDate,
        effectiveUserId,
        customerId
      );

      res.status(200).json({
        success: true,
        message: 'Visits report generated',
        data: report,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/reports/sales */
  public getSalesReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role;
      const { startDate, endDate, userId, customerId } = salesReportQuerySchema.parse(req.query);

      const effectiveUserId =
        role === 'FIELD_EMPLOYEE' ? req.user!.id : userId;

      const report = await this.reportService.getSalesReport(
        companyId,
        startDate,
        endDate,
        effectiveUserId,
        customerId
      );

      res.status(200).json({
        success: true,
        message: 'Sales report generated',
        data: report,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}
