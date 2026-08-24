import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon } from './AppIcon';

interface SectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Section({ title, actionLabel, onAction, children, style }: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[typography.overline, { color: theme.colors.text.secondary }]}>
          {title}
        </Text>

        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.actionBtn}>
            <Text style={[typography.buttonSm, { color: theme.colors.brand.primary, fontSize: 12 }]}>
              {actionLabel}
            </Text>
            <AppIcon name="chevronRight" color={theme.colors.brand.primary} size={14} />
          </TouchableOpacity>
        )}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
