import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  Camera,
  Map,
  ViewAnnotation,
  type CameraRef,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import {
  getMapStyleUrl,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_INDIA_OVERVIEW_CENTER,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_OVERVIEW_ZOOM,
  MAP_ROUTE_COLORS,
} from '../../config/mapConfig';
import type { MapMarker, NetroMapProps } from '../../types/map';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';
import {
  collectMapCoordinates,
  computeBounds,
  filterValidMarkers,
  filterValidRoutes,
  isValidCoordinate,
  mergePadding,
  toLngLat,
} from '../../utils/map/mapCoordinateUtils';
import { MapControls } from './MapControls';
import { MapMarkerView } from './MapMarkerView';
import { MapRouteLayer } from './MapRouteLayer';

function NetroMapComponent({
  markers = [],
  routes = [],
  currentLocation = null,
  fitToCoordinates = false,
  showControls = true,
  initialCenter,
  initialZoom,
  padding,
  loading = false,
  emptyMessage,
  onMarkerPress,
  onMapReady,
  style,
  testID = 'netro-map',
}: NetroMapProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const mapReadyRef = useRef(false);

  const mapStyle = useMemo(
    () => getMapStyleUrl(colorScheme === 'dark' ? 'dark' : 'light'),
    [colorScheme],
  );

  const validMarkers = useMemo(() => filterValidMarkers(markers), [markers]);
  const validRoutes = useMemo(() => {
    return filterValidRoutes(routes).map((route) => ({
      ...route,
      color:
        route.color ??
        (route.type === 'remaining'
          ? MAP_ROUTE_COLORS.remaining
          : route.type === 'travelled'
            ? MAP_ROUTE_COLORS.travelled
            : MAP_ROUTE_COLORS.historical),
      width: route.width ?? (route.type === 'remaining' ? 2 : 4),
    }));
  }, [routes]);

  const current = isValidCoordinate(currentLocation) ? currentLocation : null;
  const cameraPadding = useMemo(() => mergePadding(padding), [padding]);

  const allCoords = useMemo(
    () =>
      collectMapCoordinates({
        markers: validMarkers,
        routes: validRoutes,
        currentLocation: current,
      }),
    [validMarkers, validRoutes, current],
  );

  const hasContent = allCoords.length > 0;

  const defaultCenter = initialCenter ?? (hasContent ? allCoords[0] : MAP_INDIA_OVERVIEW_CENTER);
  const defaultZoom = initialZoom ?? (hasContent ? MAP_DEFAULT_ZOOM : MAP_OVERVIEW_ZOOM);

  const fitCamera = useCallback(
    (animated: boolean) => {
      const bounds = computeBounds(allCoords);
      if (!bounds || !cameraRef.current) return;
      cameraRef.current.fitBounds(bounds, {
        padding: cameraPadding,
        duration: animated ? 450 : 0,
      });
    },
    [allCoords, cameraPadding],
  );

  const recenter = useCallback(() => {
    if (!cameraRef.current) return;
    if (current) {
      cameraRef.current.easeTo({
        center: toLngLat(current),
        zoom: 15,
        duration: 400,
      });
      return;
    }
    fitCamera(true);
  }, [current, fitCamera]);

  const zoomBy = useCallback(async (delta: number) => {
    if (!cameraRef.current) return;
    let currentZoom = MAP_DEFAULT_ZOOM;
    try {
      const liveZoom = await mapRef.current?.getZoom();
      if (typeof liveZoom === 'number' && Number.isFinite(liveZoom)) {
        currentZoom = liveZoom;
      }
    } catch {
      // Fall back to default zoom if native query fails
    }
    const next = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, currentZoom + delta));
    cameraRef.current.zoomTo(next, { duration: 200 });
  }, []);

  const zoomIn = useCallback(() => {
    zoomBy(1).catch(() => undefined);
  }, [zoomBy]);

  const zoomOut = useCallback(() => {
    zoomBy(-1).catch(() => undefined);
  }, [zoomBy]);

  useEffect(() => {
    if (!fitToCoordinates || !mapReadyRef.current || !hasContent) return;
    fitCamera(true);
  }, [fitToCoordinates, hasContent, fitCamera, allCoords.length]);

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
    if (fitToCoordinates && hasContent) {
      fitCamera(false);
    }
    onMapReady?.();
  }, [fitToCoordinates, hasContent, fitCamera, onMapReady]);

  const handleMarkerPress = useCallback(
    (marker: MapMarker) => {
      onMarkerPress?.(marker);
    },
    [onMarkerPress],
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={mapStyle}
        compass
        attribution
        logo={false}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={() => {
          // Style/network failure — keep empty overlay messaging below
        }}
      >
        <Camera
          ref={cameraRef}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          initialViewState={{
            center: toLngLat(defaultCenter ?? MAP_DEFAULT_CENTER),
            zoom: defaultZoom,
          }}
        />

        <MapRouteLayer routes={validRoutes} />

        {current ? (
          <ViewAnnotation
            id="netro-current-location"
            lngLat={toLngLat(current)}
            anchor="center"
          >
            <MapMarkerView
              marker={{
                id: 'current-location',
                coordinate: current,
                type: 'current',
                title: 'Current location',
              }}
            />
          </ViewAnnotation>
        ) : null}

        {validMarkers.map((marker) => (
          <ViewAnnotation
            key={marker.id}
            id={marker.id}
            lngLat={toLngLat(marker.coordinate)}
            title={marker.title}
            snippet={marker.description}
            anchor={marker.type === 'start' || marker.type === 'end' ? 'bottom' : 'center'}
            onSelect={() => handleMarkerPress(marker)}
          >
            <MapMarkerView
              marker={marker}
              selected={marker.status === 'selected'}
            />
          </ViewAnnotation>
        ))}
      </Map>

      {loading ? (
        <View style={styles.overlayCenter} pointerEvents="none">
          <ActivityIndicator color={theme.colors.brand.primary} size="large" />
        </View>
      ) : null}

      {!loading && !hasContent ? (
        <View style={styles.overlayCenter} pointerEvents="none">
          <Text style={[typography.bodySm, styles.emptyText, { color: theme.colors.text.secondary }]}>
            {emptyMessage ?? 'No map data to display'}
          </Text>
        </View>
      ) : null}

      {showControls ? (
        <MapControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitAll={hasContent ? () => fitCamera(true) : undefined}
          onRecenter={current || hasContent ? recenter : undefined}
          showZoom
          showFitAll={hasContent}
          showRecenter={Boolean(current) || hasContent}
        />
      ) : null}
    </View>
  );
}

export const NetroMap = memo(NetroMapComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  overlayCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
  },
});
