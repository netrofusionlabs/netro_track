import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, ImageStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface AvatarProps {
  name?: string;
  source?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  backgroundColor?: string;
  style?: ViewStyle;
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  source,
  size = 'md',
  backgroundColor,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [source]);

  const dimensions = size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  const bgColor = backgroundColor ?? theme.colors.brand.primaryLight;
  const textColor = theme.colors.brand.primary;

  if (source && !hasError) {
    return (
      <Image
        source={{ uri: source }}
        onError={() => setHasError(true)}
        style={[
          styles.avatar,
          { width: dimensions, height: dimensions, borderRadius: dimensions / 2 },
          style as ImageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dimensions,
          height: dimensions,
          borderRadius: dimensions / 2,
          backgroundColor: bgColor,
          borderColor: theme.colors.surface.border,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { color: textColor, fontSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
