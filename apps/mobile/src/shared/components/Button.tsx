import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  labelStyle
}: ButtonProps) {
  const theme = useTheme();

  const getStyles = () => {
    let backgroundColor = theme.colors.brand.primary;
    let borderColor = 'transparent';
    let textColor = theme.colors.text.inverse;

    if (variant === 'secondary') {
      backgroundColor = theme.colors.brand.secondary;
    } else if (variant === 'danger') {
      backgroundColor = theme.colors.semantic.error;
    } else if (variant === 'outline') {
      backgroundColor = 'transparent';
      borderColor = theme.colors.brand.primary;
      textColor = theme.colors.brand.primary;
    }

    if (disabled) {
      backgroundColor = theme.colors.surface.input;
      textColor = theme.colors.text.tertiary;
      borderColor = 'transparent';
    }

    return { backgroundColor, borderColor, textColor };
  };

  const { backgroundColor, borderColor, textColor } = getStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg
        },
        style
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize: 16 }, labelStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  label: {
    fontWeight: '600'
  }
});
