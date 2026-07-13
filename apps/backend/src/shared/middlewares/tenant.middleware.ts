import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export interface TenantRequest extends Request {
  companyId?: string;
}

export function tenantMiddleware(
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): void {
  const companyId = req.headers['x-company-id'] || req.body.companyId;

  if (!companyId) {
    return next(new AppError('MISSING_TENANT_ID', 'Tenant Identification is required', 400));
  }

  if (typeof companyId !== 'string') {
    return next(new AppError('INVALID_TENANT_ID', 'Tenant ID must be a string UUID', 400));
  }

  req.companyId = companyId;
  next();
}
