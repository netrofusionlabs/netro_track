import React from 'react';
import { View, ViewStyle, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { shadows } from '../theme/shadows';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  noPadding?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  noPadding = false,
  onPress,
  style,
}: CardProps) {
  const theme = useTheme();

  const isElevated = variant === 'elevated';
  const isFlat = variant === 'flat';
  const isOutlined = variant === 'outlined';

  const cardStyle: ViewStyle = {
    backgroundColor: isFlat ? theme.colors.surface.subtle : theme.colors.surface.card,
    borderRadius: theme.borderRadius.lg,
    borderColor: isFlat ? 'transparent' : theme.colors.surface.border,
    borderWidth: isFlat ? 0 : 1,
    padding: noPadding ? 0 : theme.spacing.lg,
    ...(isElevated ? shadows.md : variant === 'default' ? shadows.card : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.card, cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
