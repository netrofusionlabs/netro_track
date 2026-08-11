import { Platform, ViewStyle } from 'react-native';

/**
 * NetroTrack Design System — Elevation / Shadow Presets
 *
 * Design philosophy: Modern enterprise apps use almost zero shadows.
 * Depth comes from background contrast and borders — not heavy drop shadows.
 * Shadows are used sparingly to float critical UI above the page.
 *
 * All shadow opacities are deliberately low for a subtle, refined feel.
 */
export const shadows = {
  /** No shadow — default for inline elements, flat surfaces */
  none: {} as ViewStyle,

  /** Subtle card — list items, stat boxes */
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }) as ViewStyle,

  /** Standard card elevation — dashboard cards, form cards */
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,

  /** Prominent — modals, bottom sheets */
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle,

  /** Hero / floating cards — login card, elevated overlays */
  xl: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }) as ViewStyle,
};
