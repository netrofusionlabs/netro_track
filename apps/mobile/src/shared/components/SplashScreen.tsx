import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandLogo } from './BrandLogo';

const SPLASH_BACKGROUND = '#E8ECF0';

/**
 * Branded loading splash shown while persisted auth/consent state hydrates.
 * Matches native Android/iOS launch screens (light grey + banner logo).
 */
export function SplashScreen() {
  return (
    <View style={styles.container} accessibilityLabel="NetroTrack loading">
      <BrandLogo variant="banner" size={300} />
      <ActivityIndicator style={styles.spinner} color="#1E40AF" size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BACKGROUND,
    paddingHorizontal: 32,
  },
  spinner: {
    marginTop: 28,
  },
});
