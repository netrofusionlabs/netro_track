import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/request';
import { SaleService } from './sale.service';
import { createSaleSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

export class SaleController {
  private saleService = new SaleService();

  public getSales = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const role = req.user!.role as Role;
      const employeeId = req.query.employeeId as string | undefined;

      const sales = await this.saleService.getSales(companyId, userId, role, employeeId);
      res.status(200).json({
        success: true,
        message: 'Sales records retrieved successfully',
        data: sales,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const validated = createSaleSchema.parse(req.body);

      const record = await this.saleService.createSale(companyId, userId, validated);
      res.status(201).json({
        success: true,
        message: 'Sale checkout logged successfully',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getSaleById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const targetId = req.params.id;

      const record = await this.saleService.getSaleById(companyId, targetId);
      res.status(200).json({
        success: true,
        message: 'Sale transaction retrieved',
        data: record,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getTodaySales = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const sales = await this.saleService.getTodaySales(companyId, userId);
      res.status(200).json({
        success: true,
        message: "Today's sales retrieved",
        data: sales,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
