import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useLoadingStore } from '../stores/loadingStore';
import { useTheme } from '../theme/ThemeProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function GlobalLoadingBar() {
  const theme = useTheme();
  const isLoading = useLoadingStore((s) => s.isLoading);
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH * 0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;

    if (isLoading) {
      // Fade in the bar
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Start looping indeterminate progress
      translateX.setValue(-SCREEN_WIDTH * 0.5);
      animationLoop = Animated.loop(
        Animated.timing(translateX, {
          toValue: SCREEN_WIDTH,
          duration: 1100,
          useNativeDriver: true,
        })
      );
      animationLoop.start();
    } else {
      // Fade out the bar
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(-SCREEN_WIDTH * 0.5);
      });
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
    };
  }, [isLoading, opacity, translateX]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface.border,
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.brand.primary,
            transform: [{ translateX }],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 99999,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.5,
    borderRadius: 2,
  },
});
