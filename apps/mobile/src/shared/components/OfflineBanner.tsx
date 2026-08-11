/**
 * OfflineBanner — Animated connectivity status indicator.
 *
 * Subscribes to NetInfo and slides in from the top when offline.
 * Automatically disappears when connection is restored.
 *
 * Usage: Place inside the root navigator shell (e.g. AppNavigator.tsx)
 *
 *   <NavigationContainer>
 *     <OfflineBanner />
 *     <Stack.Navigator ... />
 *   </NavigationContainer>
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const BANNER_HEIGHT = 44;

export function OfflineBanner(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      setShowBanner(true);
      // Slide in + fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showBanner) {
      // Slide out + fade out, then hide
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -BANNER_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setShowBanner(false));
    }
  }, [isOffline, showBanner, translateY, opacity]);

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="No internet connection. Changes will sync automatically when reconnected."
    >
      <View style={styles.content}>
        <Text style={styles.icon}>⚠</Text>
        <Text style={styles.text}>
          You're offline — changes sync automatically
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#D97706', // Amber-600 — visible but not alarming
    height: BANNER_HEIGHT,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  icon: {
    fontSize: 14,
    color: '#FFFBEB',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFBEB',
    textAlign: 'center',
  },
});
