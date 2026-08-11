import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ProgressBarProps {
  /** Progress ratio between 0 and 1 */
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, color, height = 4, style }: ProgressBarProps) {
  const theme = useTheme();

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillColor = color ?? theme.colors.brand.primary;

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: theme.colors.surface.subtle,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: fillColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
