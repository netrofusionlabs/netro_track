import { Request, Response, NextFunction } from 'express';
import { BranchService } from './branch.service';
import { AppRequest } from '../../shared/types/express';

export class BranchController {
  private service: BranchService;

  constructor() {
    this.service = new BranchService();
    // Bind methods to preserve 'this' context
    this.getBranches = this.getBranches.bind(this);
    this.getBranch = this.getBranch.bind(this);
    this.createBranch = this.createBranch.bind(this);
    this.updateBranch = this.updateBranch.bind(this);
    this.deleteBranch = this.deleteBranch.bind(this);
  }

  private getTargetCompanyId(req: Request): string {
    const appReq = req as AppRequest;
    const user = appReq.user;
    if (
      user &&
      (user.role === 'SUPER_ADMIN' || user.role === 'MASTER_SUPER_ADMIN') &&
      (req.query.companyId || req.body.companyId)
    ) {
      return (req.query.companyId || req.body.companyId) as string;
    }
    return appReq.companyId;
  }

  async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = this.getTargetCompanyId(req);
      const branches = await this.service.getBranches(companyId);

      res.status(200).json({
        success: true,
        message: 'Branches retrieved successfully',
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = this.getTargetCompanyId(req);
      const branch = await this.service.getBranch(req.params.id, companyId);

      res.status(200).json({
        success: true,
        message: 'Branch retrieved successfully',
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = this.getTargetCompanyId(req);
      const branch = await this.service.createBranch(companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = this.getTargetCompanyId(req);
      const branch = await this.service.updateBranch(req.params.id, companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Branch updated successfully',
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = this.getTargetCompanyId(req);
      await this.service.deleteBranch(req.params.id, companyId);

      res.status(200).json({
        success: true,
        message: 'Branch deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
