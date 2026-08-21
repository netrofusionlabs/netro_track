import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, throwError, of, map } from 'rxjs';
import { Persona, Role, personaFor } from '../models/roles';
import { accessTokenLive, safeReturnPath } from '../utils/token';

/** The envelope every NetroTrack endpoint responds with. */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PageInfo;
  error?: { code: string; details?: Array<{ field: string; message: string }> };
  meta?: { timestamp: string; requestId?: string };
}

export interface PageInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CurrentUser {
  id: string;
  companyId?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyCode?: string | null;
  employeeId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  secondaryPhone?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  role: Role;
  status?: string;
  profilePictureUrl?: string | null;
  designation?: { id: string; name: string } | null;
  designationName?: string | null;
  department?: { id: string; name: string } | null;
  departmentName?: string | null;
  manager?: { id: string; name: string; employeeId?: string } | null;
  managerId?: string | null;
  managerName?: string | null;
  managerEmployeeId?: string | null;
  company?: {
    id: string;
    name: string;
    code?: string;
    logoUrl?: string | null;
    companyLogoUrl?: string | null;
    industry?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
  isGpsTracked?: boolean;
  [key: string]: unknown;
}

export type QueryValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = '/api/v1';
  private endingSession = false;

  /** Retained as observables so existing call sites keep working. */
  readonly token$ = new BehaviorSubject<string | null>(liveStoredToken());
  readonly currentUser$ = new BehaviorSubject<CurrentUser | null>(null);

  /** Signal mirrors for templates. */
  readonly user = signal<CurrentUser | null>(null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly persona = computed<Persona>(() => personaFor(this.user()?.role));
  readonly companyName = computed(() => this.user()?.companyName ?? this.user()?.company?.name ?? (this.user() as any)?.company_name ?? null);
  readonly companyLogoUrl = computed(() => this.user()?.companyLogoUrl ?? this.user()?.company?.logoUrl ?? this.user()?.company?.companyLogoUrl ?? null);
  readonly companyId = computed(() => this.user()?.companyId ?? this.user()?.company?.id ?? null);
  /** True until the first `/auth/me` round-trip settles, so the shell can hold. */
  readonly bootstrapping = signal<boolean>(!!liveStoredToken());

  constructor() {
    this.currentUser$.subscribe(u => this.user.set(u));
    const stored = liveStoredToken();
    if (stored) {
      this.fetchCurrentUser().subscribe({
        next: () => this.bootstrapping.set(false),
        error: () => {
          this.bootstrapping.set(false);
          this.logout();
        },
      });
    } else if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      sessionStorage.setItem('netro.needSignIn', 'expired');
      this.bootstrapping.set(false);
    }
  }

  // ---- Transport ---------------------------------------------------------

  private headers(): HttpHeaders {
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.token$.value;
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  private toParams(query?: Record<string, QueryValue>): HttpParams | undefined {
    if (!query) return undefined;
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      params = params.set(key, String(value));
    }
    return params.keys().length ? params : undefined;
  }

  get<T = unknown>(url: string, query?: Record<string, QueryValue>): Observable<ApiEnvelope<T>> {
    return this.http.get<ApiEnvelope<T>>(`${this.baseUrl}${url}`, {
      headers: this.headers(),
      params: this.toParams(query),
    });
  }

  post<T = unknown>(url: string, body: unknown = {}): Observable<ApiEnvelope<T>> {
    return this.http.post<ApiEnvelope<T>>(`${this.baseUrl}${url}`, body, { headers: this.headers() });
  }

  put<T = unknown>(url: string, body: unknown = {}): Observable<ApiEnvelope<T>> {
    return this.http.put<ApiEnvelope<T>>(`${this.baseUrl}${url}`, body, { headers: this.headers() });
  }

  delete<T = unknown>(url: string, body?: unknown): Observable<ApiEnvelope<T>> {
    return this.http.delete<ApiEnvelope<T>>(`${this.baseUrl}${url}`, { headers: this.headers(), body });
  }

  /**
   * List endpoints that a role may legitimately be forbidden from reading.
   * Resolves to an empty list on 401/403 so a partially-permitted dashboard
   * renders what it can instead of collapsing into an error.
   */
  list<T = unknown>(url: string, query?: Record<string, QueryValue>): Observable<T[]> {
    return this.get<T[]>(url, query).pipe(
      map(res => (Array.isArray(res.data) ? res.data : [])),
      catchError(() => of([] as T[])),
    );
  }

  /** Single-object read that degrades to `null` rather than throwing. */
  one<T = unknown>(url: string, query?: Record<string, QueryValue>): Observable<T | null> {
    return this.get<T>(url, query).pipe(
      map(res => (res.success ? (res.data ?? null) : null)),
      catchError(() => of(null)),
    );
  }

  // ---- Authentication ----------------------------------------------------

  login(payload: { loginId: string; password: string; deviceId: string }): Observable<ApiEnvelope<any>> {
    return this.post<any>('/auth/login', payload).pipe(tap(res => this.acceptSession(res)));
  }

  mpinLogin(payload: { loginId: string; mpin: string; deviceId: string }): Observable<ApiEnvelope<any>> {
    return this.post<any>('/auth/mpin', payload).pipe(tap(res => this.acceptSession(res)));
  }

  private acceptSession(res: ApiEnvelope<any>): void {
    const token = res.data?.accessToken ?? res.data?.token;
    if (res.success && token) {
      localStorage.setItem('token', token);
      this.token$.next(token);
      const user = res.data.user ?? null;
      this.currentUser$.next(user);
      rememberLoginId(user);
      this.bootstrapping.set(false);
    }
  }

  fetchCurrentUser(): Observable<ApiEnvelope<CurrentUser>> {
    return this.get<CurrentUser>('/auth/me').pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUser$.next(res.data);
          rememberLoginId(res.data);
        }
        this.bootstrapping.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        this.bootstrapping.set(false);
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    this.clearSession();
  }
  expireSession(fromUrl?: string): void {
    if (this.endingSession || this.router.url.startsWith('/login')) {
      this.clearSession();
      return;
    }
    this.endingSession = true;
    this.clearSession();
    sessionStorage.setItem('netro.needSignIn', 'expired');
    const next = safeReturnPath(fromUrl);
    void this.router
      .navigate(['/login'], { queryParams: { reason: 'expired', next } })
      .finally(() => {
        this.endingSession = false;
      });
  }

  lastLoginId(): string | null {
    return localStorage.getItem(LAST_LOGIN_KEY);
  }

  isAuthenticated(): boolean {
    return accessTokenLive(this.token$.value);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    this.token$.next(null);
    this.currentUser$.next(null);
    this.bootstrapping.set(false);
  }

  getUserRole(): string | null {
    return this.currentUser$.value?.role ?? null;
  }

  /**
   * Stable per-browser device identifier. The login endpoint registers a
   * device against it, so it must survive reloads.
   */
  deviceId(): string {
    const key = 'netro.deviceId';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `web-${uuidish()}`;
      localStorage.setItem(key, id);
    }
    return id;
  }
}

function uuidish(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const LAST_LOGIN_KEY = 'netro.lastLoginId';

function liveStoredToken(): string | null {
  const token = localStorage.getItem('token');
  return accessTokenLive(token) ? token : null;
}

function rememberLoginId(user: CurrentUser | null): void {
  const id = user?.employeeId || user?.email;
  if (typeof id === 'string' && id.trim()) localStorage.setItem(LAST_LOGIN_KEY, id.trim());
}

/** Pulls the most specific human-readable message out of any failure shape. */
export function apiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  const http = err as HttpErrorResponse;
  if (http.status === 0) return 'Cannot reach the NetroTrack API. Check your connection and try again.';
  const body = http.error as ApiEnvelope | undefined;
  const detail = body?.error?.details?.[0];
  if (detail?.message) return detail.field ? `${labelise(detail.field)}: ${detail.message}` : detail.message;
  if (body?.message) return body.message;
  if (http.status === 401) return 'Your session has expired. Please sign in again.';
  if (http.status === 403) return 'You do not have permission to perform this action.';
  if (http.status === 404) return 'That record could not be found.';
  if (http.status === 409) return 'That action conflicts with the current state of the record.';
  if (http.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (http.message) return http.message;
  return fallback;
}

/** Field-level validation errors keyed by control name, for inline display. */
export function fieldErrors(err: unknown): Record<string, string> {
  const body = (err as HttpErrorResponse)?.error as ApiEnvelope | undefined;
  const out: Record<string, string> = {};
  for (const d of body?.error?.details ?? []) {
    if (d.field) out[d.field] = d.message;
  }
  return out;
}

function labelise(field: string): string {
  return field
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}
