import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export function LoadingState({ message, style }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      {message && (
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 12 }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
});
