import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { RoleHierarchyService } from './role-hierarchy.service';
import { ApprovalService } from '../../shared/services/approval.service';

export class RoleHierarchyController {
  private readonly service = new RoleHierarchyService();
  private readonly approvalService = new ApprovalService();

  /** Resolve the correct companyId — Super/Master Admins may pass a query param. */
  private resolveCompanyId(req: AuthenticatedRequest): string {
    const isSuperLevel =
      req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'MASTER_SUPER_ADMIN';
    if (isSuperLevel) {
      const fromQuery = req.query.companyId as string | undefined;
      if (fromQuery) return fromQuery;
    }
    return req.companyId!;
  }

  public getCompanyRoles = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.getCompanyRoles(companyId);
      res.json({ success: true, message: 'Role hierarchy fetched successfully', data });
    } catch (err) {
      next(err);
    }
  };

  public getCompanyRole = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.getCompanyRoleById(companyId, req.params.id);
      res.json({ success: true, message: 'Role fetched successfully', data });
    } catch (err) {
      next(err);
    }
  };

  public createCompanyRole = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.createRole(req.user!.role, companyId, req.body);
      res.status(201).json({ success: true, message: 'Role created successfully', data });
    } catch (err) {
      next(err);
    }
  };

  public updateCompanyRole = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.updateRole(req.user!.role, companyId, req.params.id, req.body);
      res.json({ success: true, message: 'Role updated successfully', data });
    } catch (err) {
      next(err);
    }
  };

  public deleteCompanyRole = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.deleteRole(req.user!.role, companyId, req.params.id);
      res.json({ success: true, message: data.message });
    } catch (err) {
      next(err);
    }
  };

  public reorderCompanyRoles = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const data = await this.service.reorderRoles(req.user!.role, companyId, req.body);
      res.json({ success: true, message: 'Role hierarchy reordered successfully', data });
    } catch (err) {
      next(err);
    }
  };

  public getApprovalHistory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = this.resolveCompanyId(req);
      const { requestType, requestId } = req.params;
      const data = await this.approvalService.getApprovalHistory(companyId, requestType, requestId);
      res.json({ success: true, message: 'Approval history fetched successfully', data });
    } catch (err) {
      next(err);
    }
  };
}
