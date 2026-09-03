import { useAuthStore } from '../../features/auth/stores/authStore';

/**
 * React hook to evaluate dynamic permissions in mobile screens and components.
 */
export function usePermission(slug: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'MASTER_SUPER_ADMIN') return true;

  const isPlatformCompany = user.companyName?.toLowerCase().includes('netro') ?? false;
  if (isPlatformCompany && (user.role === 'SUPER_ADMIN' || user.role === 'MASTER_SUPER_ADMIN')) {
    return true;
  }

  const companyEntitledSlugs = user.companyEntitledSlugs;
  const isCompanyAdmin = user.role === 'COMPANY_ADMIN' || user.role === 'SUPER_ADMIN';

  // For company admin, check if the company is entitled to the capability
  if (isCompanyAdmin) {
    if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
      if (companyEntitledSlugs.includes(slug)) return true;
      if (slug.endsWith('.*')) {
        const prefix = slug.slice(0, -1);
        return companyEntitledSlugs.some((p) => p.startsWith(prefix));
      }
      // Also check if any parent module is entitled
      const parts = slug.split('.');
      if (parts.length > 1 && companyEntitledSlugs.includes(parts[0])) return true;
      return false;
    }
    return true;
  }

  const perms = user.permissions || [];
  if (perms.includes(slug)) return true;

  if (slug.endsWith('.*')) {
    const prefix = slug.slice(0, -1);
    return perms.some((p) => p.startsWith(prefix));
  }

  return false;
}

/**
 * React hook to evaluate whether the user has access to a module.
 */
export function useHasModule(moduleSlug: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'MASTER_SUPER_ADMIN') return true;

  const isPlatformCompany = user.companyName?.toLowerCase().includes('netro') ?? false;
  if (isPlatformCompany && (user.role === 'SUPER_ADMIN' || user.role === 'MASTER_SUPER_ADMIN')) {
    return true;
  }

  const prefix = `${moduleSlug}.`;
  const companyEntitledSlugs = user.companyEntitledSlugs;

  // 1. If companyEntitledSlugs is present, company must be entitled to this module
  if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
    const isCompanyEntitled = companyEntitledSlugs.some((s) => s === moduleSlug || s.startsWith(prefix));
    if (!isCompanyEntitled) return false;
  }

  // 2. For Company Admins and Super Admins, having company entitlement grants module access
  if (user.role === 'COMPANY_ADMIN' || user.role === 'SUPER_ADMIN') {
    if (companyEntitledSlugs && companyEntitledSlugs.length > 0) {
      return companyEntitledSlugs.some((s) => s === moduleSlug || s.startsWith(prefix));
    }
    return true;
  }

  // 3. Standard users must also possess permissions for this module
  const perms = user.permissions || [];
  return perms.some((p) => p.startsWith(prefix) || p === moduleSlug);
}
