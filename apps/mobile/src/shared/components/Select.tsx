import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface SelectProps {
  label?: string;
  value?: string;
  placeholder?: string;
  icon?: AppIconName | string;
  error?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Select({
  label,
  value,
  placeholder = 'Select option...',
  icon,
  error,
  onPress,
  disabled = false,
  style,
}: SelectProps) {
  const theme = useTheme();

  const borderColor = error
    ? theme.colors.semantic.error
    : theme.colors.surface.border;

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, style]}>
      {label && (
        <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.trigger,
          {
            backgroundColor: disabled ? theme.colors.surface.disabled : theme.colors.surface.card,
            borderRadius: theme.borderRadius.md,
            borderColor,
            borderWidth: error ? 1.5 : 1,
          },
        ]}
      >
        {icon && (
          <View style={styles.iconWrap}>
            <AppIcon name={icon} color={theme.colors.text.tertiary} size={18} />
          </View>
        )}
        <Text
          style={[
            typography.bodyMd,
            {
              color: value ? theme.colors.text.primary : theme.colors.text.tertiary,
              flex: 1,
            },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <AppIcon name="chevronDown" color={theme.colors.text.tertiary} size={18} />
      </TouchableOpacity>
      {error && (
        <Text style={[typography.caption, { color: theme.colors.semantic.error, marginTop: 4 }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
  },
  iconWrap: {
    marginRight: 8,
  },
});
