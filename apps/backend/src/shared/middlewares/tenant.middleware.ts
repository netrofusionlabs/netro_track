import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types/request';

export interface TenantRequest extends Request {
  companyId?: string;
  user?: AuthenticatedRequest['user'];
}

export function tenantMiddleware(
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): void {
  const companyId =
    req.companyId ||
    req.user?.companyId ||
    (req.headers['x-company-id'] as string | undefined) ||
    req.body?.companyId;

  if (!companyId) {
    return next(new AppError('MISSING_TENANT_ID', 'Tenant Identification is required', 400));
  }

  if (typeof companyId !== 'string') {
    return next(new AppError('INVALID_TENANT_ID', 'Tenant ID must be a string UUID', 400));
  }

  req.companyId = companyId;
  next();
}
