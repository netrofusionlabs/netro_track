/**
 * Map provider / style configuration.
 *
 * Tile styles are isolated here so the provider can be swapped
 * (OpenFreeMap → MapTiler / self-hosted) without touching NetroMap.
 *
 * OpenFreeMap serves OSM-based vector tiles with a production-friendly policy.
 * Optional MapTiler key can override styles when configured.
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

/** Optional MapTiler key — leave empty to use OpenFreeMap defaults. */
const MAPTILER_API_KEY = '';

const OPENFREEMAP_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

function mapTilerStyle(styleId: string): string {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_API_KEY}`;
}

export type MapThemeMode = 'light' | 'dark';

export function getMapStyleUrl(mode: MapThemeMode): string {
  if (MAPTILER_API_KEY.trim().length > 0) {
    return mode === 'dark'
      ? mapTilerStyle('streets-v2-dark')
      : mapTilerStyle('streets-v2');
  }
  return mode === 'dark' ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT;
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
