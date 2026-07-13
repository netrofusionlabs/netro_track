import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from '../errors/AppError';

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(new AppError('FORBIDDEN', 'You do not have permission to access this resource', 403));
    }

    next();
  };
}
