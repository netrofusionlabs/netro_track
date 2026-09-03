import { Injectable, computed, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly api = inject(ApiService);

  /** Reactive set of effective permissions for the authenticated user */
  readonly effectivePermissions = computed<Set<string>>(() => this.api.permissions());

  /** Whether the user is the master system administrator */
  readonly isMasterSuperAdmin = computed<boolean>(() => this.api.role() === 'MASTER_SUPER_ADMIN');

  /**
   * Evaluates whether the current user has a specific permission slug.
   *
   * @param slug Permission slug (e.g. 'attendance.punch.create') or wildcard (e.g. 'attendance.punch.*')
   */
  has(slug: string): boolean {
    if (this.isMasterSuperAdmin()) return true;

    const user = this.api.user();
    const isCompanyAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN';
    const companyEntitledSlugs = user?.companyEntitledSlugs;

    if (isCompanyAdmin) {
      if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
        if (companyEntitledSlugs.includes(slug)) return true;
        if (slug.endsWith('.*')) {
          const prefix = slug.slice(0, -1);
          return companyEntitledSlugs.some((p) => p.startsWith(prefix));
        }
        const parts = slug.split('.');
        if (parts.length > 1 && companyEntitledSlugs.includes(parts[0])) return true;
        return false;
      }
      return true;
    }

    const perms = this.effectivePermissions();
    if (perms.has(slug)) return true;

    if (slug.endsWith('.*')) {
      const prefix = slug.slice(0, -1);
      for (const p of perms) {
        if (p.startsWith(prefix)) return true;
      }
    }

    return false;
  }

  /**
   * Returns true if the user possesses AT LEAST ONE of the specified permission slugs.
   */
  hasAny(...slugs: string[]): boolean {
    if (this.isMasterSuperAdmin()) return true;
    return slugs.some((slug) => this.has(slug));
  }

  /**
   * Returns true if the user possesses ALL of the specified permission slugs.
   */
  hasAll(...slugs: string[]): boolean {
    if (this.isMasterSuperAdmin()) return true;
    return slugs.every((slug) => this.has(slug));
  }

  /**
   * Returns true if the user has access to at least one capability within the specified module.
   */
  hasModule(moduleSlug: string): boolean {
    if (this.isMasterSuperAdmin()) return true;

    const user = this.api.user();
    if (user?.companyName?.toLowerCase().includes('netro') && (user.role === 'SUPER_ADMIN' || user.role === 'MASTER_SUPER_ADMIN')) {
      return true;
    }

    const companyEntitledSlugs = user?.companyEntitledSlugs;
    const prefix = `${moduleSlug}.`;

    if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
      const isEntitled = companyEntitledSlugs.some(s => s === moduleSlug || s.startsWith(prefix));
      if (!isEntitled) return false;
    }

    if (user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN') {
      if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
        return companyEntitledSlugs.some(s => s === moduleSlug || s.startsWith(prefix));
      }
      return true;
    }

    const perms = this.effectivePermissions();

    for (const p of perms) {
      if (p.startsWith(prefix) || p === moduleSlug) return true;
    }

    return false;
  }
}
