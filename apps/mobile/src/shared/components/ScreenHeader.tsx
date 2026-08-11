import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textBlock}>
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: theme.colors.brand.primary }]}
          activeOpacity={0.8}
        >
          {actionIcon && <Text style={styles.actionIcon}>{actionIcon}</Text>}
          <Text style={[typography.buttonSm, { color: '#FFFFFF' }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  actionIcon: {
    fontSize: 14,
  },
});
