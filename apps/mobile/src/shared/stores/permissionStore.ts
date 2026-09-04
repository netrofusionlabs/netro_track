import { create } from 'zustand';
import { useAuthStore } from '../../features/auth/stores/authStore';

interface PermissionTargetUser {
  id: string;
  role?: string;
  roleRank?: number | null;
  companyRole?: { rank: number } | null;
  managerId?: string | null;
}

interface PermissionState {
  has: (slug: string) => boolean;
  hasAny: (...slugs: string[]) => boolean;
  hasAll: (...slugs: string[]) => boolean;
  hasModule: (moduleSlug: string) => boolean;
  canApproveUser: (targetUser: PermissionTargetUser) => boolean;
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

  canApproveUser: (targetUser: PermissionTargetUser) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return false;

    // Cannot approve own request
    if (currentUser.id === targetUser.id) return false;

    // Platform Super Admins can approve anyone
    if (currentUser.role === 'MASTER_SUPER_ADMIN' || currentUser.role === 'SUPER_ADMIN') {
      return true;
    }

    // Company Admin has Rank 1 — highest authority inside company
    if (currentUser.role === 'COMPANY_ADMIN') {
      return true;
    }

    // Direct manager check
    const isDirectManager = targetUser.managerId === currentUser.id;

    // Dynamic rank comparison (lower rank number = higher seniority)
    const myRank = currentUser.companyRole?.rank ?? currentUser.roleRank;
    const targetRank = targetUser.companyRole?.rank ?? targetUser.roleRank;
    const hasHigherRank = myRank != null && targetRank != null ? myRank < targetRank : false;

    return isDirectManager || hasHigherRank;
  },
}));
