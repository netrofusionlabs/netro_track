import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../../shared/utils/storage';

export interface UserProfile {
  id: string;
  companyId: string;
  companyName?: string;
  employeeId: string;
  name: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  lastLoginId: string | null;
  isMpinVerified: boolean;
  setCredentials: (credentials: { user: UserProfile; accessToken: string; refreshToken: string; loginId: string }) => void;
  clearCredentials: () => void;
  setMpinVerified: (verified: boolean) => void;
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
      setCredentials: ({ user, accessToken, refreshToken, loginId }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, lastLoginId: loginId }),
      clearCredentials: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isMpinVerified: false }),
      setMpinVerified: (verified) => set({ isMpinVerified: verified })
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastLoginId: state.lastLoginId
      })
    }
  )
);
