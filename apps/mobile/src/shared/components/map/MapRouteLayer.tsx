import React, { memo, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { MAP_ROUTE_COLORS } from '../../config/mapConfig';
import type { MapRoute } from '../../types/map';
import {
  downsampleCoordinates,
  filterValidRoutes,
  toLngLat,
} from '../../utils/map/mapCoordinateUtils';
import { useTheme } from '../../theme/ThemeProvider';

interface MapRouteLayerProps {
  routes: MapRoute[];
}

function resolveRouteColor(route: MapRoute, fallback: string): string {
  if (route.color) return route.color;
  if (route.type === 'remaining') return MAP_ROUTE_COLORS.remaining;
  if (route.type === 'travelled') return MAP_ROUTE_COLORS.travelled;
  if (route.type === 'planned') return MAP_ROUTE_COLORS.planned;
  return fallback;
}

function MapRouteLayerComponent({ routes }: MapRouteLayerProps) {
  const theme = useTheme();
  const validRoutes = useMemo(() => filterValidRoutes(routes), [routes]);
  const fallbackColor = theme.colors.brand.primary;

  if (validRoutes.length === 0) return null;

  return (
    <>
      {validRoutes.map((route) => {
        const coordinates = downsampleCoordinates(route.coordinates).map(toLngLat);
        const color = resolveRouteColor(route, fallbackColor);
        const width = route.width ?? (route.type === 'remaining' ? 2.5 : 4.5);
        const data: GeoJSON.Feature = {
          type: 'Feature',
          properties: { id: route.id },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        };

        return (
          <GeoJSONSource key={route.id} id={`netro-route-${route.id}`} data={data}>
            <Layer
              id={`netro-route-line-${route.id}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': width,
                'line-opacity': 0.95,
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </GeoJSONSource>
        );
      })}
    </>
  );
}

export const MapRouteLayer = memo(MapRouteLayerComponent);
