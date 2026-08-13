import { Response, NextFunction } from 'express';
import { UserManagementService } from './user-management.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { Role, UserStatus } from '@prisma/client';

export class UserManagementController {
  private service = new UserManagementService();

  public getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, status, managerId, companyId, search, tab, page, pageSize } = req.query;
      const filters = {
        role: role ? (role as Role) : undefined,
        status: status ? (status as UserStatus) : undefined,
        managerId: managerId === 'unassigned' ? null : (managerId as string | undefined),
        companyId: companyId ? String(companyId) : undefined,
        search: search ? String(search) : undefined,
        tab: tab ? (String(tab) as any) : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      };

      const result = await this.service.getUsers(req.user!, filters);
      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.items,
        pagination: result.pagination,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getUserById(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.createUser(req.user!, req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateUser(req.user!, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public deactivateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.deactivateUser(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public activateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.activateUser(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'User reactivated successfully',
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public removeManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.removeManager(req.user!, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Manager removed and subordinates reassigned successfully',
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public resetCredentials = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resetUserCredentials(req.user!, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getCompanyManagers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
      const managers = await this.service.getCompanyManagers(req.user!, companyId);
      res.status(200).json({
        success: true,
        message: 'Managers retrieved successfully',
        data: managers,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getSupervisors = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetRole = req.query.targetRole ? String(req.query.targetRole) : 'EMPLOYEE';
      const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const excludeUserId = req.query.excludeUserId ? String(req.query.excludeUserId) : undefined;
      const supervisors = await this.service.getSupervisors(req.user!, targetRole, companyId, search, excludeUserId);
      res.status(200).json({
        success: true,
        message: 'Supervisors retrieved successfully',
        data: supervisors,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getUnassignedEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
      const employees = await this.service.getUnassignedEmployees(req.user!, companyId);
      res.status(200).json({
        success: true,
        message: 'Unassigned employees retrieved successfully',
        data: employees,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getUserTimeline = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timeline = await this.service.getUserTimeline(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'User timeline retrieved successfully',
        data: timeline,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}
