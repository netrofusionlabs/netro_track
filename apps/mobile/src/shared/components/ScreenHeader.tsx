import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: AppIconName | string;
  onAction?: () => void;
  variant?: 'page' | 'section';
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  variant = 'page',
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();

  const isSection = variant === 'section';
  const effectiveIcon = actionIcon || (actionLabel ? 'plus' : undefined);

  return (
    <View style={[styles.container, isSection ? styles.sectionContainer : styles.pageContainer, style]}>
      <View style={styles.textBlock}>
        <Text
          style={[
            isSection ? typography.overline : typography.displaySm,
            {
              color: isSection ? theme.colors.text.secondary : theme.colors.text.primary,
              fontSize: isSection ? 12 : 22,
              fontWeight: isSection ? '700' : '700',
              letterSpacing: isSection ? 0.6 : -0.3,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && !isSection && (
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2, fontSize: 13 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={isSection ? styles.textActionBtn : [styles.actionBtn, { backgroundColor: theme.colors.brand.primary }]}
          activeOpacity={0.7}
        >
          {effectiveIcon && (
            <AppIcon
              name={effectiveIcon}
              color={isSection ? theme.colors.brand.primary : '#FFFFFF'}
              size={isSection ? 12 : 14}
            />
          )}
          <Text
            style={[
              typography.buttonSm,
              {
                color: isSection ? theme.colors.brand.primary : '#FFFFFF',
                fontSize: isSection ? 12 : 13,
                fontWeight: isSection ? '600' : '700',
              },
            ]}
          >
            {actionLabel}
          </Text>
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
  },
  pageContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 12,
  },
  sectionContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    flexShrink: 0,
  },
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 4,
    flexShrink: 0,
  },
});
