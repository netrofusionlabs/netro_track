import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../../shared/utils/storage';

export interface UserProfile {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setCredentials: (credentials: { user: UserProfile; accessToken: string; refreshToken: string }) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setCredentials: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      clearCredentials: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandStorage)
    }
  )
);
