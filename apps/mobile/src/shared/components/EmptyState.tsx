import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: AppIconName | string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'document',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.surface.subtle }]}>
        <AppIcon name={icon} color={theme.colors.text.tertiary} size={28} />
      </View>
      <Text style={[typography.headingMd, { color: theme.colors.text.primary, textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            typography.bodySm,
            { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 4, maxWidth: 280 },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
