import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface StatCardProps {
  icon?: AppIconName | string;
  value: string | number;
  label: string;
  valueColor?: string;
  trend?: {
    text: string;
    type: 'up' | 'down' | 'neutral';
  };
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, valueColor, trend, style }: StatCardProps) {
  const theme = useTheme();
  const accentColor = valueColor ?? theme.colors.brand.primary;

  const getTrendColor = () => {
    if (!trend) return theme.colors.text.secondary;
    if (trend.type === 'up') return theme.colors.semantic.success;
    if (trend.type === 'down') return theme.colors.semantic.error;
    return theme.colors.text.secondary;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderRadius: theme.borderRadius.lg,
          borderColor: theme.colors.surface.border,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <AppIcon name={icon} color={accentColor} size={16} />
          </View>
        )}
        {trend && (
          <View style={styles.trendRow}>
            <AppIcon
              name={trend.type === 'up' ? 'trendUp' : trend.type === 'down' ? 'trendDown' : 'info'}
              color={getTrendColor()}
              size={12}
            />
            <Text style={[typography.caption, { color: getTrendColor(), fontWeight: '600', marginLeft: 2 }]}>
              {trend.text}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          typography.statValue,
          { color: accentColor, marginTop: icon ? 8 : 4 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={[
          typography.caption,
          { color: theme.colors.text.secondary, marginTop: 2 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
