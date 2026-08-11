import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surface.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.colors.surface.border,
          backgroundColor: theme.colors.surface.card,
          borderRadius: theme.borderRadius.lg,
        },
      ]}
    >
      <SkeletonLoader width="40%" height={16} />
      <SkeletonLoader width="75%" height={12} style={{ marginTop: 8 }} />
      <SkeletonLoader width="100%" height={40} style={{ marginTop: 12 }} />
    </View>
  );
}

export function SkeletonRow() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: theme.colors.surface.border,
          backgroundColor: theme.colors.surface.card,
          borderRadius: theme.borderRadius.lg,
        },
      ]}
    >
      <SkeletonLoader width={36} height={36} borderRadius={8} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonLoader width="50%" height={14} />
        <SkeletonLoader width="80%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
