import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { TenantRequest } from './tenant.middleware';
import { AuthenticatedRequest as SharedAuthenticatedRequest } from '../types/request';

export interface AuthenticatedRequest extends TenantRequest, SharedAuthenticatedRequest {}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Access token is required', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'default_access_secret') as {
      id: string;
      companyId: string;
      employeeId: string;
      role: Role;
    };

    req.user = {
      ...payload,
      isMasterAdmin: payload.role === Role.MASTER_SUPER_ADMIN
    };
    
    const overrideCompanyId = req.headers['x-company-id'] as string | undefined;
    if ((payload.role === Role.SUPER_ADMIN || payload.role === Role.MASTER_SUPER_ADMIN) && overrideCompanyId) {
      req.companyId = overrideCompanyId;
    } else {
      req.companyId = payload.companyId; // Ensure tenant injection matches token
    }

    next();
  } catch {
    next(new AppError('INVALID_TOKEN', 'Access token is invalid or expired', 401));
  }
}

// Alias for named consistency across modules
export const authenticateToken = authMiddleware;
