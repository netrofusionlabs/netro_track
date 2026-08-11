/**
 * NetroTrack Design System — Token Definitions
 *
 * Color philosophy: Deep blue primary conveys trust and authority.
 * Semantic colors are muted (dark shades) — they inform without alarming.
 * Backgrounds use warm grays (#F8FAFC) for sophistication over cold whites.
 *
 * Spacing: Strict 4px grid. Every value is a multiple of 4.
 * Border Radius: Controlled system — 3 primary sizes + full circle.
 */

export const lightTheme = {
  colors: {
    brand: {
      /** Deep blue — authoritative, trustworthy, distinct from generic Material blue */
      primary: '#1E40AF',
      /** Darker shade for pressed states */
      primaryHover: '#1E3A8A',
      /** Very subtle blue tint for icon backgrounds, selected states */
      primaryLight: '#EFF6FF',
      /** Soft blue for large highlighted surfaces */
      primaryMuted: '#DBEAFE',
      /** Emerald green — growth, success, revenue */
      secondary: '#059669',
      /** Warm amber — attention, warnings */
      accent: '#D97706',
    },
    semantic: {
      /** Dark green — confirmed, complete, active */
      success: '#15803D',
      /** Barely-there green background */
      successBg: '#F0FDF4',
      /** Dark amber — needs attention */
      warning: '#B45309',
      /** Barely-there amber background */
      warningBg: '#FFFBEB',
      /** Dark red — errors, destructive */
      error: '#B91C1C',
      /** Barely-there red background */
      errorBg: '#FEF2F2',
      /** Same as primary — informational */
      info: '#1E40AF',
      /** Same as primaryLight */
      infoBg: '#EFF6FF',
    },
    surface: {
      /** Warm off-white — NOT pure white */
      background: '#F8FAFC',
      /** Pure white cards — float above background */
      card: '#FFFFFF',
      /** Same as card — elevation via subtle shadow only */
      elevated: '#FFFFFF',
      /** Clean input backgrounds */
      input: '#FFFFFF',
      /** Card borders — visible but not heavy */
      border: '#E2E8F0',
      /** Muted surface for sections, inactive tabs, skeletons */
      subtle: '#F1F5F9',
      /** Internal dividers — barely visible */
      divider: '#F1F5F9',
      /** Modal overlay */
      overlay: 'rgba(15, 23, 42, 0.4)',
      /** Disabled interactive element backgrounds */
      disabled: '#F1F5F9',
    },
    text: {
      /** Near-black — maximum readability */
      primary: '#0F172A',
      /** Medium gray — metadata, labels */
      secondary: '#475569',
      /** Light gray — hints, disabled */
      tertiary: '#94A3B8',
      /** Very light — placeholders */
      muted: '#CBD5E1',
      /** White text on dark backgrounds */
      inverse: '#FFFFFF',
      /** Disabled text */
      disabled: '#94A3B8',
    },
  },
  spacing: {
    /** Micro adjustments (icon-to-text gap in badges) */
    xxs: 2,
    /** Tight internal padding (badge padding, dot spacing) */
    xs: 4,
    /** Compact spacing (list item gaps, inline padding) */
    sm: 8,
    /** Standard spacing (between related elements) */
    md: 12,
    /** Section padding (card internal padding, screen margins) */
    lg: 16,
    /** Generous spacing (between sections) */
    xl: 20,
    /** Large spacing (screen horizontal padding) */
    xxl: 24,
    /** Extra-large spacing (before CTAs, between major sections) */
    xxxl: 32,
    /** Maximum spacing (top/bottom screen padding) */
    xxxxl: 40,
  },
  borderRadius: {
    /** Sharp edges (dividers, hairlines) */
    none: 0,
    /** Small elements (badges, chips, small buttons) */
    sm: 6,
    /** Standard interactive elements (buttons, inputs, cards) */
    md: 8,
    /** Cards, sections, larger containers */
    lg: 12,
    /** Modal sheets, large cards */
    xl: 16,
    /** Circular elements (avatars, dots, round buttons) */
    full: 9999,
  },
};

export const darkTheme = {
  colors: {
    brand: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryLight: '#1E293B',
      primaryMuted: '#1E3A5F',
      secondary: '#10B981',
      accent: '#FBBF24',
    },
    semantic: {
      success: '#10B981',
      successBg: '#064E3B',
      warning: '#FBBF24',
      warningBg: '#78350F',
      error: '#EF4444',
      errorBg: '#7F1D1D',
      info: '#3B82F6',
      infoBg: '#1E3A5F',
    },
    surface: {
      background: '#0F172A',
      card: '#1E293B',
      elevated: '#334155',
      input: '#1E293B',
      border: '#334155',
      subtle: '#1E293B',
      divider: '#1E293B',
      overlay: 'rgba(0, 0, 0, 0.6)',
      disabled: '#334155',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      muted: '#475569',
      inverse: '#0F172A',
      disabled: '#64748B',
    },
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
};

export type Theme = typeof lightTheme;
