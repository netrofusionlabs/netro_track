import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from '../errors/AppError';
import { ROLE_RANK } from '../services/authorization.service';

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
    }

    const userRole = req.user.role as Role;

    // MASTER_SUPER_ADMIN has top-level permissions across system endpoints
    if (userRole === Role.MASTER_SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('FORBIDDEN', 'You do not have permission to access this resource', 403));
    }

    next();
  };
}

export function requireHierarchy(minimumRole: Role) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
    }

    const userRole = req.user.role as Role;
    const userRank = ROLE_RANK[userRole] ?? 0;
    const requiredRank = ROLE_RANK[minimumRole] ?? 0;

    if (userRank < requiredRank) {
      return next(new AppError('FORBIDDEN', 'Insufficient role hierarchy level', 403));
    }

    next();
  };
}

