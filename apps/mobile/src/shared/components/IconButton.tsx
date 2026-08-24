import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon, AppIconName } from './AppIcon';

interface IconButtonProps {
  icon: AppIconName | string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();

  const dimensions = theme.sizes.iconButtonSize[size];
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.brand.primary, fg: theme.colors.text.inverse, border: 'transparent' };
      case 'outline':
        return { bg: 'transparent', fg: theme.colors.brand.primary, border: theme.colors.surface.border };
      case 'danger':
        return { bg: theme.colors.semantic.errorBg, fg: theme.colors.semantic.error, border: 'transparent' };
      case 'ghost':
        return { bg: 'transparent', fg: theme.colors.text.primary, border: 'transparent' };
      default:
        return { bg: theme.colors.surface.subtle, fg: theme.colors.text.primary, border: theme.colors.surface.border };
    }
  };

  const colors = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          width: dimensions,
          height: dimensions,
          borderRadius: dimensions / 2,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: variant === 'outline' || variant === 'default' ? 1 : 0,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <AppIcon name={icon} color={colors.fg} size={iconSize} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
