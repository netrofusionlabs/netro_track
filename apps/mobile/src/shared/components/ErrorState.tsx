import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon } from './AppIcon';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data. Please try again.',
  onRetry,
  style,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.semantic.errorBg }]}>
        <AppIcon name="warning" color={theme.colors.semantic.error} size={28} />
      </View>

      <Text style={[typography.headingMd, { color: theme.colors.text.primary, textAlign: 'center' }]}>
        {title}
      </Text>

      <Text
        style={[
          typography.bodySm,
          { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 4, maxWidth: 280 },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
          icon="refresh"
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
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
