import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';

export const CURRENT_CONSENT_VERSION = '1.0';

export interface ConsentState {
  hasAcceptedConsent: boolean;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  acceptConsent: (version?: string) => void;
  resetConsent: () => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      hasAcceptedConsent: false,
      acceptedVersion: null,
      acceptedAt: null,
      acceptConsent: (version = CURRENT_CONSENT_VERSION) =>
        set({
          hasAcceptedConsent: true,
          acceptedVersion: version,
          acceptedAt: new Date().toISOString(),
        }),
      resetConsent: () =>
        set({
          hasAcceptedConsent: false,
          acceptedVersion: null,
          acceptedAt: null,
        }),
    }),
    {
      name: 'attendance-consent-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

/**
 * Returns true if the user has accepted consent and the accepted version matches the current consent version.
 */
export function isConsentValid(state: ConsentState): boolean {
  return state.hasAcceptedConsent && state.acceptedVersion === CURRENT_CONSENT_VERSION;
}
