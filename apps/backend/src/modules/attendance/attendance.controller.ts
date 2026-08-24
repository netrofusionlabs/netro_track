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
      const role = req.user!.role;
      const employeeId = req.query.employeeId as string | undefined;

      // Manager/Admin can request any employee's history via ?employeeId=
      const targetId = (employeeId && (role === 'MANAGER' || role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN'))
        ? employeeId
        : userId;

      const history = await this.attendanceService.getHistory(companyId, targetId);
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
      const employeeId = req.query.employeeId as string | undefined;

      // Drill-down: manager viewing a specific employee's attendance for a date
      if (employeeId) {
        const record = await this.attendanceService.getEmployeeAttendanceForDate(companyId, employeeId, dateStr);
        res.status(200).json({
          success: true,
          message: 'Employee attendance retrieved',
          data: record,
          meta: { timestamp: new Date().toISOString() }
        });
        return;
      }

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

  public getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role;
      const mode = (req.query.mode as 'monthly' | 'all' | 'today') || 'monthly';
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const employeeId = req.query.employeeId as string | undefined;

      // Managers/Admins can view any employee's summary via ?employeeId=
      const targetId = (employeeId && (role === 'MANAGER' || role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN'))
        ? employeeId
        : userId;

      const summary = await this.attendanceService.getSummary(companyId, targetId, mode, year, month);
      res.status(200).json({
        success: true,
        message: 'Attendance summary retrieved',
        data: summary,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public requestRegularization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const record = await this.attendanceService.requestRegularization(companyId, userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Regularization request submitted successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getRegularizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role;
      const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
      const personal = req.query.personal === 'true';

      const records = await this.attendanceService.getRegularizations(companyId, userId, role, status, personal);
      res.status(200).json({
        success: true,
        message: 'Regularization requests retrieved successfully',
        data: records,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public reviewRegularization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const reviewerId = req.user!.id;
      const { id } = req.params;
      const { action, remarks } = req.body;

      if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
        res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
        return;
      }

      const result = await this.attendanceService.reviewRegularization(companyId, reviewerId, id, action, remarks);
      res.status(200).json({
        success: true,
        message: `Regularization request ${action.toLowerCase()} successfully`,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public bulkReviewRegularizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const reviewerId = req.user!.id;
      const { ids, action, remarks } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'Invalid or empty list of regularization IDs' });
        return;
      }

      if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
        res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
        return;
      }

      const results = await this.attendanceService.bulkReviewRegularizations(companyId, reviewerId, ids, action, remarks);
      res.status(200).json({
        success: true,
        message: `Bulk processed ${ids.length} regularization requests successfully`,
        data: results,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
