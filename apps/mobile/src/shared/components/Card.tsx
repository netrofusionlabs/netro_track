import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { shadows } from '../theme/shadows';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const theme = useTheme();

  const variantStyles: ViewStyle =
    variant === 'outlined'
      ? { borderWidth: 1, borderColor: theme.colors.surface.input }
      : variant === 'elevated'
      ? shadows.lg
      : shadows.md;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface.card, borderRadius: theme.borderRadius.lg },
        variantStyles,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
});
