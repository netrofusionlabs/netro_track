import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'failed';

interface SyncIndicatorProps {
  state: SyncState;
  showText?: boolean;
  style?: ViewStyle;
}

export function SyncIndicator({ state, showText = true, style }: SyncIndicatorProps) {
  const theme = useTheme();

  const getConfig = () => {
    switch (state) {
      case 'synced':
        return { color: theme.colors.semantic.success, label: 'Synced' };
      case 'syncing':
        return { color: theme.colors.brand.primary, label: 'Syncing...' };
      case 'pending':
        return { color: theme.colors.semantic.warning, label: 'Pending sync' };
      case 'failed':
        return { color: theme.colors.semantic.error, label: 'Sync failed' };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      {showText && (
        <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
