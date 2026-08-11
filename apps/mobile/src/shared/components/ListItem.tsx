import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface ListItemProps {
  icon?: AppIconName | string;
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  trailingText?: string;
  trailingColor?: string;
  showChevron?: boolean;
  compact?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ListItem({
  icon,
  avatar,
  title,
  subtitle,
  trailing,
  trailingText,
  trailingColor,
  showChevron = false,
  compact = false,
  onPress,
  style,
}: ListItemProps) {
  const theme = useTheme();

  const isPressable = !!onPress;
  const shouldShowChevron = showChevron || (isPressable && !trailing && !trailingText);

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface.card,
          borderRadius: theme.borderRadius.lg,
          borderColor: theme.colors.surface.border,
          paddingVertical: compact ? 8 : 12,
          paddingHorizontal: 12,
        },
        style,
      ]}
    >
      {avatar ? (
        <View style={styles.leftContainer}>{avatar}</View>
      ) : icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.brand.primaryLight }]}>
          <AppIcon name={icon} color={theme.colors.brand.primary} size={18} />
        </View>
      ) : null}

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
            { color: trailingColor ?? theme.colors.text.primary, marginLeft: 10 },
          ]}
          numberOfLines={1}
        >
          {trailingText}
        </Text>
      ) : null)}

      {shouldShowChevron && (
        <View style={styles.chevronContainer}>
          <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={16} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
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
    marginBottom: 8,
    borderWidth: 1,
  },
  leftContainer: {
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  chevronContainer: {
    marginLeft: 8,
  },
});
