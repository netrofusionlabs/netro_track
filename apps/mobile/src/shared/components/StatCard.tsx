import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';

interface StatCardProps {
  icon?: string;
  value: string | number;
  label: string;
  valueColor?: string;
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, valueColor, style }: StatCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: theme.colors.surface.card, borderRadius: theme.borderRadius.lg },
        style,
      ]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text
        style={[
          typography.statValue,
          { color: valueColor ?? theme.colors.brand.primary },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: theme.colors.text.secondary, marginTop: 4, textAlign: 'center' },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  icon: {
    fontSize: 20,
    marginBottom: 6,
  },
});
