import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, color, backgroundColor, size = 'sm', style }: BadgeProps) {
  const theme = useTheme();

  const bgColor = backgroundColor ?? theme.colors.brand.primaryLight;
  const textColor = color ?? theme.colors.brand.primary;

  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        { backgroundColor: bgColor },
        style,
      ]}
    >
      <Text
        style={[
          size === 'md' ? typography.caption : styles.textSm,
          { color: textColor, fontWeight: '700' },
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
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  textSm: {
    fontSize: 11,
    fontWeight: '700',
  },
});
