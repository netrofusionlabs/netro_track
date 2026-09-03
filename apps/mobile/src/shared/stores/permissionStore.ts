import { create } from 'zustand';
import { useAuthStore } from '../../features/auth/stores/authStore';

interface PermissionState {
  has: (slug: string) => boolean;
  hasAny: (...slugs: string[]) => boolean;
  hasAll: (...slugs: string[]) => boolean;
  hasModule: (moduleSlug: string) => boolean;
}

export const usePermissionStore = create<PermissionState>(() => ({
  has: (slug: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (user.role === 'MASTER_SUPER_ADMIN') return true;

    const perms = user.permissions || [];
    if (perms.includes(slug)) return true;

    if (slug.endsWith('.*')) {
      const prefix = slug.slice(0, -1);
      return perms.some((p) => p.startsWith(prefix));
    }

    return false;
  },

  hasAny: (...slugs: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (user.role === 'MASTER_SUPER_ADMIN') return true;

    const perms = user.permissions || [];
    return slugs.some((slug) => {
      if (perms.includes(slug)) return true;
      if (slug.endsWith('.*')) {
        const prefix = slug.slice(0, -1);
        return perms.some((p) => p.startsWith(prefix));
      }
      return false;
    });
  },

  hasAll: (...slugs: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (user.role === 'MASTER_SUPER_ADMIN') return true;

    const perms = user.permissions || [];
    return slugs.every((slug) => {
      if (perms.includes(slug)) return true;
      if (slug.endsWith('.*')) {
        const prefix = slug.slice(0, -1);
        return perms.some((p) => p.startsWith(prefix));
      }
      return false;
    });
  },

  hasModule: (moduleSlug: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (user.role === 'MASTER_SUPER_ADMIN') return true;

    const perms = user.permissions || [];
    const prefix = `${moduleSlug}.`;
    return perms.some((p) => p.startsWith(prefix) || p === moduleSlug);
  },
}));
