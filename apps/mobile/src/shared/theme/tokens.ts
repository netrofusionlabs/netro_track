export const lightTheme = {
  colors: {
    brand: {
      primary: '#2563EB',
      primaryLight: '#DBEAFE',
      secondary: '#059669',
      accent: '#F59E0B'
    },
    semantic: {
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB'
    },
    surface: {
      background: '#F8FAFC',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      input: '#F1F5F9'
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
      inverse: '#FFFFFF'
    }
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999
  }
};

export const darkTheme = {
  colors: {
    brand: {
      primary: '#3B82F6',
      primaryLight: '#1E3A5F',
      secondary: '#10B981',
      accent: '#FBBF24'
    },
    semantic: {
      success: '#10B981',
      warning: '#FBBF24',
      error: '#EF4444',
      info: '#3B82F6'
    },
    surface: {
      background: '#0F172A',
      card: '#1E293B',
      elevated: '#334155',
      input: '#1E293B'
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      inverse: '#0F172A'
    }
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius
};

export type Theme = typeof lightTheme;
