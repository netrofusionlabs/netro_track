import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, storage } from '../../../shared/utils/storage';

export interface UserProfile {
  id: string;
  companyId: string;
  companyName?: string;
  companyLogoUrl?: string;
  employeeId: string;
  name: string;
  role: string;
  isMasterAdmin?: boolean;
  isGpsEnabled?: boolean;
  isRegularizationEnabled?: boolean;
  isGpsTracked?: boolean;
  hasMpin?: boolean;
  attendancePolicyId?: string | null;
  email?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodGroup?: string | null;
  designation?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  permissions?: string[];
  companyEntitledSlugs?: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  lastLoginId: string | null;
  isMpinVerified: boolean;
  /** True once the user has successfully completed MPIN setup (persisted) */
  hasMpin: boolean;
  setCredentials: (credentials: { user: UserProfile; accessToken: string; refreshToken: string; loginId: string }) => void;
  clearCredentials: () => void;
  setMpinVerified: (verified: boolean) => void;
  setHasMpin: (has: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      lastLoginId: null,
      isMpinVerified: false,
      hasMpin: false,
      setCredentials: ({ user, accessToken, refreshToken, loginId }) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          lastLoginId: loginId,
          hasMpin: user.hasMpin ?? false,
          isMpinVerified: false,
        }),
      clearCredentials: () => {
        storage.remove('local_mpin_hash');
        storage.remove('last_active_attendance_session');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isMpinVerified: false });
      },
      setMpinVerified: (verified) => set({ isMpinVerified: verified }),
      setHasMpin: (has) => set({ hasMpin: has }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastLoginId: state.lastLoginId,
        hasMpin: state.hasMpin,
      })
    }
  )
);
