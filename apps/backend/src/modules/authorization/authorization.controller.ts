import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { AuthorizationService } from './authorization.service';

export class AuthorizationController {
  private service = new AuthorizationService();

  /**
   * Resolves the target companyId for super admin cross-tenant operations.
   * Super admins may pass companyId via query param or request body.
   * Non-super-admin users always get their own companyId from JWT.
   */
  private resolveCompanyId(req: AuthenticatedRequest): string {
    const isSuper = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'MASTER_SUPER_ADMIN';
    if (isSuper) {
      const fromQuery = req.query.companyId as string | undefined;
      const fromBody = req.body?.companyId as string | undefined;
      if (fromQuery) return fromQuery;
      if (fromBody) return fromBody;
    }
    return req.companyId!;
  }

  public getPlatformCapabilities = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.getPlatformCapabilities();
      res.json({
        success: true,
        message: 'Platform capabilities fetched successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public createCapability = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.createCapability(req.user!.id, req.body, req.companyId);
      res.status(201).json({
        success: true,
        message: 'Platform capability created successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateCapability = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.updateCapability(
        req.params.id,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        message: 'Platform capability updated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteCapability = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.deleteCapability(req.params.id, req.user!.id);
      res.json({
        success: true,
        message: data.message,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAvailableCapabilities = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.getAvailableCapabilitiesForTenant(targetCompanyId);
      res.json({
        success: true,
        message: 'Available tenant capabilities fetched successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAccessGroups = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.getTenantAccessGroups(targetCompanyId);
      res.json({
        success: true,
        message: 'Access groups fetched successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAccessGroup = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.getAccessGroupById(targetCompanyId, req.params.id);
      res.json({
        success: true,
        message: 'Access group fetched successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public createAccessGroup = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.createAccessGroup(
        targetCompanyId,
        req.user!.id,
        req.body
      );
      res.status(201).json({
        success: true,
        message: 'Access group created successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateAccessGroup = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.updateAccessGroup(
        targetCompanyId,
        req.params.id,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        message: 'Access group updated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteAccessGroup = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = this.resolveCompanyId(req);
      const data = await this.service.deleteAccessGroup(
        targetCompanyId,
        req.params.id,
        req.user!.id
      );
      res.json({
        success: true,
        message: data.message,
      });
    } catch (err) {
      next(err);
    }
  };

  public assignUserGroups = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.assignUserAccessGroups(
        req.companyId!,
        req.params.userId,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        message: data.message,
      });
    } catch (err) {
      next(err);
    }
  };

  public assignUserDirectPermissions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.assignUserDirectPermissions(
        req.companyId!,
        req.params.userId,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        message: data.message,
      });
    } catch (err) {
      next(err);
    }
  };

  public getUserAccessProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.getUserAccessProfile(
        req.companyId!,
        req.params.userId
      );
      res.json({
        success: true,
        message: 'User access profile and provenance resolved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public getTenantEntitlements = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = req.params.companyId || req.companyId!;
      const data = await this.service.getTenantEntitlements(targetCompanyId);
      res.json({
        success: true,
        message: 'Tenant entitlements fetched successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateTenantEntitlements = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const targetCompanyId = req.params.companyId;
      const data = await this.service.updateTenantEntitlements(
        targetCompanyId,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        message: data.message,
      });
    } catch (err) {
      next(err);
    }
  };
}
