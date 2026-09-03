import { create } from 'zustand';

interface LoadingState {
  activeRequests: number;
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  resetLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  activeRequests: 0,
  isLoading: false,

  startLoading: () =>
    set((state) => {
      const nextCount = state.activeRequests + 1;
      return {
        activeRequests: nextCount,
        isLoading: nextCount > 0,
      };
    }),

  stopLoading: () =>
    set((state) => {
      const nextCount = Math.max(0, state.activeRequests - 1);
      return {
        activeRequests: nextCount,
        isLoading: nextCount > 0,
      };
    }),

  resetLoading: () =>
    set({
      activeRequests: 0,
      isLoading: false,
    }),
}));
