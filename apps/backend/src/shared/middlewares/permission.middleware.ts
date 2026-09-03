import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from '../errors/AppError';
import { PermissionService } from '../services/permission.service';

/**
 * Express middleware to enforce dynamic permissions against the database-backed effective access control system.
 *
 * @param requiredSlugs One or more capability slugs required to access the endpoint (e.g. 'attendance.punch.create')
 */
export function requirePermission(...requiredSlugs: string[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.companyId) {
        return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
      }

      // MASTER_SUPER_ADMIN maintains top-level system authority across all endpoints
      if (req.user.role === 'MASTER_SUPER_ADMIN') {
        return next();
      }

      const permissionService = PermissionService.getInstance();
      const isAuthorized = await permissionService.hasPermissions(
        req.user.id,
        req.companyId,
        requiredSlugs
      );

      if (!isAuthorized) {
        return next(
          new AppError('FORBIDDEN', 'You do not have permission to perform this action', 403, {
            requiredPermissions: requiredSlugs,
          })
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
