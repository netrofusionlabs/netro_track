import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { VisitService } from './visit.service';
import { createVisitSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

export class VisitController {
  private visitService = new VisitService();

  public getVisits = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role as Role;
      const employeeId = req.query.employeeId as string | undefined;

      const visits = await this.visitService.getVisits(companyId, userId, role, employeeId);
      res.status(200).json({
        success: true,
        message: 'Visits retrieved successfully',
        data: visits,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createVisit = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = createVisitSchema.parse(req.body);

      const record = await this.visitService.createVisit(companyId, userId, validated);
      res.status(201).json({
        success: true,
        message: 'Visit created successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getVisitById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const targetId = req.params.id;

      const record = await this.visitService.getVisitById(companyId, targetId);
      res.status(200).json({
        success: true,
        message: 'Visit record retrieved',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getTodayVisits = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const visits = await this.visitService.getTodayVisits(companyId, userId);
      res.status(200).json({
        success: true,
        message: "Today's visits retrieved",
        data: visits,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
