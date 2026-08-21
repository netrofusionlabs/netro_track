import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiService } from '../services/api.service';

const SESSION_CODES = new Set([
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
]);

/**
 * When the access token is missing, expired or rejected, send the person back
 * to sign in (password or MPIN). Credential failures on the login form itself
 * must not loop.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && isDeadSession(err) && !isCredentialAttempt(req.url)) {
        injector.get(ApiService).expireSession(router.url);
      }
      return throwError(() => err);
    }),
  );
};

function isDeadSession(err: HttpErrorResponse): boolean {
  if (err.status !== 401) return false;
  const code = (err.error as { error?: { code?: string } } | null)?.error?.code;
  if (!code) return true;
  return SESSION_CODES.has(code);
}

function isCredentialAttempt(url: string): boolean {
  return /\/auth\/login(?:\?|$)/.test(url) || /\/auth\/mpin(?:\?|$)/.test(url);
}
