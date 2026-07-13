import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { InspectionService } from './inspection.service';
import { createInspectionSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

export class InspectionController {
  private inspectionService = new InspectionService();

  public getInspections = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role as Role;

      const inspections = await this.inspectionService.getInspections(companyId, userId, role);
      res.status(200).json({
        success: true,
        message: 'Inspections retrieved successfully',
        data: inspections,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createInspection = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = createInspectionSchema.parse(req.body);

      const record = await this.inspectionService.createInspection(companyId, userId, validated);
      res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getTodayInspections = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const inspections = await this.inspectionService.getTodayInspections(companyId, userId);
      res.status(200).json({
        success: true,
        message: "Today's inspections retrieved",
        data: inspections,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getInspectionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const targetId = req.params.id;

      const record = await this.inspectionService.getInspectionById(companyId, targetId);
      res.status(200).json({
        success: true,
        message: 'Inspection record retrieved',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
