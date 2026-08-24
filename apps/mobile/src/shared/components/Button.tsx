import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: AppIconName | string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
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
  fullWidth = false,
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
        backgroundColor = theme.colors.surface.subtle;
        textColor = theme.colors.text.primary;
        borderColor = theme.colors.surface.border;
        borderWidth = 1;
        break;
      case 'danger':
        backgroundColor = theme.colors.semantic.error;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        borderColor = theme.colors.surface.border;
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
        : theme.colors.surface.subtle;
      textColor = theme.colors.text.tertiary;
      borderColor = variant === 'outline' ? theme.colors.surface.border : 'transparent';
    }

    return { backgroundColor, borderColor, textColor, borderWidth };
  };

  const getSizeStyles = (): { height: number; paddingHorizontal: number; textStyle: TextStyle } => {
    switch (size) {
      case 'sm':
        return { height: theme.sizes.buttonHeight.sm, paddingHorizontal: 12, textStyle: typography.buttonSm };
      case 'lg':
        return { height: theme.sizes.buttonHeight.lg, paddingHorizontal: 24, textStyle: typography.button };
      default:
        return { height: theme.sizes.buttonHeight.md, paddingHorizontal: 16, textStyle: typography.button };
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
          opacity: disabled || loading ? 0.45 : 1,
          ...(fullWidth ? { width: '100%' as const } : {}),
        },
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <AppIcon name={icon} color={textColor} size={size === 'sm' ? 14 : 16} />}
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
});
