import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { TenantRequest } from './tenant.middleware';

export interface AuthenticatedRequest extends TenantRequest {
  user?: {
    id: string;
    companyId: string;
    employeeId: string;
    role: string;
  };
}

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
      role: string;
    };

    req.user = payload;
    req.companyId = payload.companyId; // Ensure tenant injection matches token

    next();
  } catch {
    next(new AppError('INVALID_TOKEN', 'Access token is invalid or expired', 401));
  }
}
