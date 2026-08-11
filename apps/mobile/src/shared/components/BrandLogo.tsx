import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const appIcon = require('../assets/images/appIconClean.png');
const bannerLogo = require('../assets/images/bannerLogoClean.png');

export type BrandLogoVariant = 'mark' | 'banner';

interface BrandLogoProps {
  /** `mark` = icon only; `banner` = icon + NetroTrack wordmark */
  variant?: BrandLogoVariant;
  /** Square size for `mark`, or width for `banner`. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/**
 * Official NetroTrack brand mark / wordmark.
 * Use `mark` in compact chrome (headers) and `banner` on auth / loading surfaces.
 */
export function BrandLogo({
  variant = 'mark',
  size,
  style,
  imageStyle,
}: BrandLogoProps) {
  if (variant === 'banner') {
    const width = size ?? 280;
    const height = Math.round(width * (519 / 1482));

    return (
      <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel="NetroTrack">
        <Image
          source={bannerLogo}
          style={[{ width, height }, imageStyle]}
          resizeMode="contain"
        />
      </View>
    );
  }

  const markSize = size ?? 28;

  return (
    <View
      style={[
        styles.markWrap,
        {
          width: markSize,
          height: markSize,
          borderRadius: Math.max(6, Math.round(markSize * 0.22)),
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="NetroTrack"
    >
      <Image
        source={appIcon}
        style={[{ width: markSize * 0.86, height: markSize * 0.86 }, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8ECF0',
    overflow: 'hidden',
  },
});
