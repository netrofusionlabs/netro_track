import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';

interface ListItemProps {
  icon?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  trailingText?: string;
  trailingColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  trailingText,
  trailingColor,
  onPress,
  style,
}: ListItemProps) {
  const theme = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        shadows.sm,
        { backgroundColor: theme.colors.surface.card, borderRadius: theme.borderRadius.lg },
        style,
      ]}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.brand.primaryLight }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={[typography.headingSm, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ?? (trailingText ? (
        <Text
          style={[
            typography.headingSm,
            { color: trailingColor ?? theme.colors.text.primary, marginLeft: 12 },
          ]}
          numberOfLines={1}
        >
          {trailingText}
        </Text>
      ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 20,
  },
  body: {
    flex: 1,
  },
});
