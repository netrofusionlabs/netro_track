import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { Role, hasRole } from '../models/roles';

/**
 * Gate on the session first, then on capability.
 *
 * On a cold load the identity has not arrived yet, so the guard waits for the
 * first `/auth/me` rather than guessing. Getting this wrong sends a legitimate
 * admin to the Dashboard on every hard refresh of a deep link.
 */
export const authGuard: CanActivateFn = (route): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const api = inject(ApiService);
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

  const required = route.data?.['roles'] as readonly Role[] | undefined;
  if (!required?.length) return true;

  const known = api.currentUser$.value;
  if (known) return decide(known.role, required, router);

  return api.currentUser$.pipe(
    filter(user => user !== null),
    take(1),
    map(user => decide(user!.role, required, router)),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

function decide(role: string, required: readonly Role[], router: Router): boolean | UrlTree {
  if (hasRole(role, required)) return true;
  // Land somewhere useful rather than on a dead end, and say why.
  return router.createUrlTree(['/dashboard'], { queryParams: { denied: '1' } });
}
