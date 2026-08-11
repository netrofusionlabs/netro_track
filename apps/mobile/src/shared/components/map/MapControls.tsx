import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../IconButton';
import { useTheme } from '../../theme/ThemeProvider';
import { shadows } from '../../theme/shadows';

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onFitAll?: () => void;
  showZoom?: boolean;
  showRecenter?: boolean;
  showFitAll?: boolean;
}

function MapControlsComponent({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onFitAll,
  showZoom = true,
  showRecenter = true,
  showFitAll = true,
}: MapControlsProps) {
  const theme = useTheme();

  if (!showZoom && !showRecenter && !showFitAll) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.surface.border,
        },
        shadows.sm,
      ]}
    >
      {showZoom && onZoomIn ? (
        <IconButton icon="zoomIn" onPress={onZoomIn} variant="ghost" size="md" />
      ) : null}
      {showZoom && onZoomOut ? (
        <IconButton icon="zoomOut" onPress={onZoomOut} variant="ghost" size="md" />
      ) : null}
      {showFitAll && onFitAll ? (
        <IconButton icon="maximize" onPress={onFitAll} variant="ghost" size="md" />
      ) : null}
      {showRecenter && onRecenter ? (
        <IconButton icon="locationPin" onPress={onRecenter} variant="ghost" size="md" />
      ) : null}
    </View>
  );
}

export const MapControls = memo(MapControlsComponent);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    bottom: 18,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 2,
  },
});
