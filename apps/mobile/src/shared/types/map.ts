import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Map presentation types — visualization only.
 * Never encode API/backend shapes here; use feature adapters.
 */

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export type MapMarkerType =
  | 'employee'
  | 'current'
  | 'start'
  | 'end'
  | 'punch'
  | 'generic';

export type MapMarkerStatus = 'active' | 'idle' | 'stale' | 'offline' | 'selected';

export interface MapMarker {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  type?: MapMarkerType;
  status?: MapMarkerStatus;
  heading?: number;
  accuracy?: number;
  color?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export type MapRouteType = 'travelled' | 'remaining' | 'historical' | 'planned';

export interface MapRoute {
  id: string;
  coordinates: MapCoordinate[];
  type?: MapRouteType;
  title?: string;
  color?: string;
  width?: number;
}

export interface MapCameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NetroMapProps {
  markers?: MapMarker[];
  routes?: MapRoute[];
  currentLocation?: MapCoordinate | null;
  /** Fit camera to all valid markers + route coordinates on mount / data change. */
  fitToCoordinates?: boolean;
  /** Show floating recenter / fit controls. */
  showControls?: boolean;
  /** Optional initial center override (defaults to India/Bangalore-friendly region). */
  initialCenter?: MapCoordinate;
  initialZoom?: number;
  padding?: Partial<MapCameraPadding>;
  loading?: boolean;
  emptyMessage?: string;
  onMarkerPress?: (marker: MapMarker) => void;
  onMapReady?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
