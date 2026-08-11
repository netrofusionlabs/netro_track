import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[typography.headingSm, { color: theme.colors.text.primary, textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, textAlign: 'center', marginTop: 6 }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: theme.colors.brand.primary }]}
          activeOpacity={0.8}
        >
          <Text style={[typography.buttonSm, { color: '#FFFFFF' }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  actionBtn: {
    marginTop: 20,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
