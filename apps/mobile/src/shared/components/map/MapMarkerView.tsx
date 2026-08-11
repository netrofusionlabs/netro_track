import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MAP_MARKER_STATUS_COLORS } from '../../config/mapConfig';
import type { MapMarker } from '../../types/map';
import { useTheme } from '../../theme/ThemeProvider';

interface MapMarkerViewProps {
  marker: MapMarker;
  selected?: boolean;
}

function statusColor(marker: MapMarker, selected: boolean): string {
  if (marker.color) return marker.color;
  if (selected || marker.status === 'selected') return MAP_MARKER_STATUS_COLORS.selected;
  if (marker.type === 'start') return '#16A34A';
  if (marker.type === 'end') return '#DC2626';
  if (marker.type === 'current') return '#1E40AF';
  if (marker.status && marker.status in MAP_MARKER_STATUS_COLORS) {
    return MAP_MARKER_STATUS_COLORS[marker.status];
  }
  return '#1E40AF';
}

function MapMarkerViewComponent({ marker, selected = false }: MapMarkerViewProps) {
  const theme = useTheme();
  const border = statusColor(marker, selected);
  const isPin = marker.type === 'start' || marker.type === 'end' || marker.type === 'current';

  if (isPin) {
    return (
      <View style={styles.pinWrap}>
        <View style={[styles.pinDot, { backgroundColor: border }]} />
        <View style={[styles.pinStem, { backgroundColor: border }]} />
      </View>
    );
  }

  const label =
    marker.label ??
    (marker.title
      ? marker.title
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0] ?? '')
          .join('')
          .toUpperCase()
      : '•');

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: border,
          transform: [{ scale: selected ? 1.12 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            backgroundColor: selected ? theme.colors.brand.primary : theme.colors.surface.card,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: selected ? theme.colors.text.inverse : theme.colors.text.primary },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

export const MapMarkerView = memo(MapMarkerViewComponent);

const styles = StyleSheet.create({
  outer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  pinWrap: {
    alignItems: 'center',
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinStem: {
    width: 3,
    height: 10,
    marginTop: -2,
    borderRadius: 1.5,
  },
});
