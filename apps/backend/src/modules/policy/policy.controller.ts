import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { PolicyService } from './policy.service';
import {
  createPolicySchema,
  updatePolicySchema,
  assignPolicySchema,
} from '@netrotrack/shared';
import { Role, PolicyType } from '@prisma/client';

export class PolicyController {
  private service = new PolicyService();

  private getTargetCompanyId(req: AuthenticatedRequest): string {
    const user = req.user!;
    if (
      (user.role === Role.SUPER_ADMIN || user.role === Role.MASTER_SUPER_ADMIN) &&
      (req.query.companyId || req.body.companyId)
    ) {
      return (req.query.companyId || req.body.companyId) as string;
    }
    return user.companyId;
  }

  public getPolicies = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const type = req.query.type as PolicyType | undefined;
      const policies = await this.service.getPolicies(companyId, type);

      res.status(200).json({
        success: true,
        message: 'Policies retrieved successfully',
        data: policies,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPolicyById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const policy = await this.service.getPolicyById(companyId, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Policy details retrieved',
        data: policy,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public createPolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const validated = createPolicySchema.parse(req.body);
      const policy = await this.service.createPolicy(companyId, validated);

      res.status(201).json({
        success: true,
        message: 'Policy created successfully',
        data: policy,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const validated = updatePolicySchema.parse(req.body);
      const policy = await this.service.updatePolicy(companyId, req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Policy updated successfully',
        data: policy,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public deletePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      await this.service.deletePolicy(companyId, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Policy deleted successfully',
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public duplicatePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const policy = await this.service.duplicatePolicy(companyId, req.params.id);

      res.status(201).json({
        success: true,
        message: 'Policy duplicated successfully',
        data: policy,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPolicyAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const assignments = await this.service.getPolicyAssignments(companyId, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Policy assignments retrieved',
        data: assignments,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public getEffectivePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      const targetEmployeeId = req.query.employeeId as string | undefined;
      const policyType = (req.query.type as PolicyType) || PolicyType.ATTENDANCE;

      // Restrict querying other users' policies to manager roles and above
      const targetUserId =
        targetEmployeeId &&
        (currentUserRole === Role.MANAGER ||
          currentUserRole === Role.HR ||
          currentUserRole === Role.COMPANY_ADMIN ||
          currentUserRole === Role.SUPER_ADMIN ||
          currentUserRole === Role.MASTER_SUPER_ADMIN)
          ? targetEmployeeId
          : currentUserId;

      const policy = await this.service.getEffectivePolicyForUser(companyId, targetUserId, policyType);

      res.status(200).json({
        success: true,
        message: `Effective ${policyType} policy resolved`,
        data: policy,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  public assignPolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getTargetCompanyId(req);
      const validated = assignPolicySchema.parse(req.body);

      await this.service.assignPolicy(
        companyId,
        validated.policyId || null,
        validated.policyType,
        validated.targetType,
        validated.targetId
      );

      res.status(200).json({
        success: true,
        message: 'Policy assigned successfully',
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}
