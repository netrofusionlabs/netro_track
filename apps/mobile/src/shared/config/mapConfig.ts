/**
 * Map provider / style configuration.
 *
 * Primary Provider: Google Maps (via vector/raster tile styling)
 * Kept Aside: OpenStreetMap / OpenFreeMap / MapTiler (preserved for offline / fallback resilience)
 */

export const MAP_DEFAULT_CENTER = {
  /** Bangalore — good default for Indian field ops */
  latitude: 12.9716,
  longitude: 77.5946,
} as const;

export const MAP_INDIA_OVERVIEW_CENTER = {
  latitude: 20.5937,
  longitude: 78.9629,
} as const;

export const MAP_DEFAULT_ZOOM = 12;
export const MAP_OVERVIEW_ZOOM = 4.5;
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 19;

export const MAP_DEFAULT_PADDING = {
  top: 64,
  right: 40,
  bottom: 120,
  left: 40,
} as const;

export type MapProvider = 'google' | 'openstreetmap' | 'maptiler';

/** Set Google Maps as the active primary map provider across the entire app */
export const ACTIVE_MAP_PROVIDER: MapProvider = 'google';

/** Optional MapTiler key */
const MAPTILER_API_KEY = '';

/**
 * Google Maps Roadmap / Standard style definition for map view rendering.
 */
export const GOOGLE_MAPS_ROADS_STYLE = {
  version: 8,
  sources: {
    'google-roads': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'google-roads-layer',
      type: 'raster',
      source: 'google-roads',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/**
 * Google Maps Dark mode style definition for map view rendering.
 */
export const GOOGLE_MAPS_DARK_STYLE = {
  version: 8,
  sources: {
    'google-dark': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&apistyle=s.e%3Ag%7Cp.c%3A%23212121%2Cs.t%3A1314%7Ce%3Ag%7Cp.c%3A%231d2c4d%2Cs.t%3A5%7Ce%3Ag.k%7Cp.c%3A%232b3f59',
        'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&apistyle=s.e%3Ag%7Cp.c%3A%23212121%2Cs.t%3A1314%7Ce%3Ag%7Cp.c%3A%231d2c4d%2Cs.t%3A5%7Ce%3Ag.k%7Cp.c%3A%232b3f59',
        'https://mt2.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&apistyle=s.e%3Ag%7Cp.c%3A%23212121%2Cs.t%3A1314%7Ce%3Ag%7Cp.c%3A%231d2c4d%2Cs.t%3A5%7Ce%3Ag.k%7Cp.c%3A%232b3f59',
        'https://mt3.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&apistyle=s.e%3Ag%7Cp.c%3A%23212121%2Cs.t%3A1314%7Ce%3Ag%7Cp.c%3A%231d2c4d%2Cs.t%3A5%7Ce%3Ag.k%7Cp.c%3A%232b3f59',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'google-dark-layer',
      type: 'raster',
      source: 'google-dark',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/**
 * OpenStreetMap (OpenFreeMap) styles kept aside for fallback.
 */
export const OPENSTREETMAP_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
export const OPENSTREETMAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

function mapTilerStyle(styleId: string): string {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_API_KEY}`;
}

export type MapThemeMode = 'light' | 'dark';

export function getMapStyleUrl(mode: MapThemeMode = 'light', provider: MapProvider = ACTIVE_MAP_PROVIDER): string {
  if (provider === 'google') {
    return JSON.stringify(mode === 'dark' ? GOOGLE_MAPS_DARK_STYLE : GOOGLE_MAPS_ROADS_STYLE);
  }
  if (provider === 'maptiler' && MAPTILER_API_KEY.trim().length > 0) {
    return mode === 'dark' ? mapTilerStyle('streets-v2-dark') : mapTilerStyle('streets-v2');
  }
  // OpenStreetMap fallback (kept aside)
  return mode === 'dark' ? OPENSTREETMAP_DARK : OPENSTREETMAP_LIGHT;
}

export const MAP_ROUTE_COLORS = {
  travelled: '#1E40AF',
  remaining: '#94A3B8',
  historical: '#2563EB',
  planned: '#059669',
} as const;

export const MAP_MARKER_STATUS_COLORS = {
  active: '#22C55E',
  idle: '#EAB308',
  stale: '#EF4444',
  offline: '#EF4444',
  selected: '#1E40AF',
} as const;
