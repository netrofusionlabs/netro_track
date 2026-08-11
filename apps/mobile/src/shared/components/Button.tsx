import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
  labelStyle,
}: ButtonProps) {
  const theme = useTheme();

  const getVariantStyles = () => {
    let backgroundColor = theme.colors.brand.primary;
    let borderColor = 'transparent';
    let textColor = theme.colors.text.inverse;
    let borderWidth = 0;

    switch (variant) {
      case 'secondary':
        backgroundColor = theme.colors.brand.secondary;
        break;
      case 'danger':
        backgroundColor = theme.colors.semantic.error;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        borderColor = theme.colors.brand.primary;
        textColor = theme.colors.brand.primary;
        borderWidth = 1.5;
        break;
      case 'ghost':
        backgroundColor = 'transparent';
        textColor = theme.colors.brand.primary;
        break;
    }

    if (disabled) {
      backgroundColor = variant === 'outline' || variant === 'ghost'
        ? 'transparent'
        : theme.colors.surface.input;
      textColor = theme.colors.text.tertiary;
      borderColor = variant === 'outline' ? theme.colors.surface.input : 'transparent';
    }

    return { backgroundColor, borderColor, textColor, borderWidth };
  };

  const getSizeStyles = (): { height: number; paddingHorizontal: number; textStyle: TextStyle } => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: 14, textStyle: typography.buttonSm };
      case 'lg':
        return { height: 56, paddingHorizontal: 24, textStyle: typography.button };
      default:
        return { height: 48, paddingHorizontal: 20, textStyle: typography.button };
    }
  };

  const { backgroundColor, borderColor, textColor, borderWidth } = getVariantStyles();
  const { height, paddingHorizontal, textStyle } = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: theme.borderRadius.md,
          height,
          paddingHorizontal,
          opacity: disabled || loading ? 0.7 : 1,
        },
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
          <Text style={[textStyle, { color: textColor }, labelStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
});
