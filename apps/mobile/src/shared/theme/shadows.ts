import { Platform, ViewStyle } from 'react-native';

/**
 * Platform-aware shadow presets.
 *
 * Replaces the repeated Platform.select({ ios: { shadow... }, android: { elevation: N } })
 * blocks that were duplicated across every single screen.
 */
export const shadows = {
  /** Subtle card — e.g. list items, stat boxes */
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }) as ViewStyle,

  /** Default card elevation — dashboard cards, form cards */
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,

  /** Prominent card — modals, forms, elevated overlays */
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle,

  /** Hero / floating cards — login card, bottom sheets */
  xl: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 28,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }) as ViewStyle,
};
