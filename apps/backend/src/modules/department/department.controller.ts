import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from './department.service';
import { AppRequest } from '../../shared/types/express';

export class DepartmentController {
  private service: DepartmentService;

  constructor() {
    this.service = new DepartmentService();
    // Bind methods to preserve 'this' context
    this.getDepartments = this.getDepartments.bind(this);
    this.getDepartment = this.getDepartment.bind(this);
    this.createDepartment = this.createDepartment.bind(this);
    this.updateDepartment = this.updateDepartment.bind(this);
    this.deleteDepartment = this.deleteDepartment.bind(this);
  }

  async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = (req as AppRequest).companyId;
      const depts = await this.service.getDepartments(companyId);

      res.status(200).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: depts,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = (req as AppRequest).companyId;
      const dept = await this.service.getDepartment(req.params.id, companyId);

      res.status(200).json({
        success: true,
        message: 'Department retrieved successfully',
        data: dept,
      });
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = (req as AppRequest).companyId;
      const dept = await this.service.createDepartment(companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: dept,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = (req as AppRequest).companyId;
      const dept = await this.service.updateDepartment(req.params.id, companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Department updated successfully',
        data: dept,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = (req as AppRequest).companyId;
      await this.service.deleteDepartment(req.params.id, companyId);

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
