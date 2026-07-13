import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { AttendanceService } from './attendance.service';
import { punchInSchema, punchOutSchema } from '@netrotrack/shared';

export class AttendanceController {
  private attendanceService = new AttendanceService();

  public getActivePunch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const active = await this.attendanceService.getActivePunch(companyId, userId);
      res.status(200).json({
        success: true,
        message: active ? 'Active punch retrieved' : 'No active punch found',
        data: active || null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public punchIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = punchInSchema.parse(req.body);

      const record = await this.attendanceService.punchIn(companyId, userId, validated);
      res.status(201).json({
        success: true,
        message: 'Punched in successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public punchOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = punchOutSchema.parse(req.body);

      const record = await this.attendanceService.punchOut(companyId, userId, validated);
      res.status(200).json({
        success: true,
        message: 'Punched out successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const history = await this.attendanceService.getHistory(companyId, userId);
      res.status(200).json({
        success: true,
        message: 'Attendance history retrieved',
        data: history,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getToday = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const record = await this.attendanceService.getToday(companyId, userId);
      res.status(200).json({
        success: true,
        message: record ? "Today's attendance retrieved" : 'No attendance record for today',
        data: record || null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const dateStr = req.query.date as string | undefined;

      const records = await this.attendanceService.getTeamAttendance(companyId, userId, dateStr);
      res.status(200).json({
        success: true,
        message: 'Team attendance retrieved',
        data: records,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const dateStr = req.query.date as string | undefined;

      const records = await this.attendanceService.getCompanyAttendance(companyId, dateStr);
      res.status(200).json({
        success: true,
        message: 'Company attendance summary retrieved',
        data: records,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getMonthly = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

      const records = await this.attendanceService.getMonthlyAttendance(companyId, userId, year, month);
      res.status(200).json({
        success: true,
        message: 'Monthly attendance retrieved',
        data: records,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
