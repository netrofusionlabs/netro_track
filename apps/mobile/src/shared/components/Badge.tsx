import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string;
  backgroundColor?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'default',
  color,
  backgroundColor,
  dot = false,
  size = 'sm',
  style,
}: BadgeProps) {
  const theme = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.colors.semantic.successBg, fg: theme.colors.semantic.success };
      case 'warning':
        return { bg: theme.colors.semantic.warningBg, fg: theme.colors.semantic.warning };
      case 'error':
        return { bg: theme.colors.semantic.errorBg, fg: theme.colors.semantic.error };
      case 'info':
        return { bg: theme.colors.semantic.infoBg, fg: theme.colors.semantic.info };
      default:
        return { bg: theme.colors.brand.primaryLight, fg: theme.colors.brand.primary };
    }
  };

  const preset = getVariantColors();
  const bgColor = backgroundColor ?? preset.bg;
  const textColor = color ?? preset.fg;

  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        { backgroundColor: bgColor, borderRadius: theme.borderRadius.sm },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: textColor }]} />}
      <Text
        style={[
          size === 'md' ? typography.caption : styles.textSm,
          { color: textColor, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textSm: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
