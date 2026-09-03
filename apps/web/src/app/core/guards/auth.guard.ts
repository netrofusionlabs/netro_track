import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';
import { ApiService, CurrentUser } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { Role, hasRole } from '../models/roles';

/**
 * Enterprise Route Guard: Gates on session first, then on dynamic effective permissions,
 * with seamless fallback to legacy role arrays.
 */
export const authGuard: CanActivateFn = (route): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const api = inject(ApiService);
  const perms = inject(PermissionService);
  const router = inject(Router);

  if (!api.isAuthenticated()) {
    const next = router.getCurrentNavigation()?.finalUrl?.toString();
    const expired = sessionStorage.getItem('netro.needSignIn') === 'expired';
    return router.createUrlTree(['/login'], {
      queryParams: {
        ...(expired ? { reason: 'expired' } : {}),
        ...(next ? { next } : {}),
      },
    });
  }

  const permission = route.data?.['permission'] as string | undefined;
  const permissions = route.data?.['permissions'] as string[] | undefined;
  const requiredRoles = route.data?.['roles'] as readonly Role[] | undefined;

  // No specific access constraints on route
  if (!permission && !permissions?.length && !requiredRoles?.length) {
    return true;
  }

  const known = api.currentUser$.value;
  if (known) {
    return decideAccess(known, perms, permission, permissions, requiredRoles, router);
  }

  return api.currentUser$.pipe(
    filter((user) => user !== null),
    take(1),
    map((user) => decideAccess(user!, perms, permission, permissions, requiredRoles, router)),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

function decideAccess(
  user: CurrentUser,
  perms: PermissionService,
  permission: string | undefined,
  permissions: string[] | undefined,
  requiredRoles: readonly Role[] | undefined,
  router: Router
): boolean | UrlTree {
  // Master Super Admin bypasses all checks
  if (user.role === 'MASTER_SUPER_ADMIN') {
    return true;
  }

  // 1. Dynamic permission check (Primary)
  if (permission) {
    if (perms.has(permission)) return true;
    return router.createUrlTree(['/dashboard'], { queryParams: { denied: '1' } });
  }

  if (permissions?.length) {
    if (perms.hasAny(...permissions)) return true;
    return router.createUrlTree(['/dashboard'], { queryParams: { denied: '1' } });
  }

  // 2. Legacy role array fallback
  if (requiredRoles?.length) {
    if (hasRole(user.role, requiredRoles)) return true;
    return router.createUrlTree(['/dashboard'], { queryParams: { denied: '1' } });
  }

  return true;
}
