import type {
  MapCameraPadding,
  MapCoordinate,
  MapMarker,
  MapRoute,
} from '../../types/map';
import { MAP_DEFAULT_PADDING } from '../../config/mapConfig';

const MAX_ROUTE_POINTS = 1500;

export function isValidCoordinate(coord: MapCoordinate | null | undefined): coord is MapCoordinate {
  if (!coord) return false;
  const { latitude, longitude } = coord;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** MapLibre uses [longitude, latitude]. */
export function toLngLat(coord: MapCoordinate): [number, number] {
  return [coord.longitude, coord.latitude];
}

export function filterValidCoordinates(coords: MapCoordinate[]): MapCoordinate[] {
  return coords.filter(isValidCoordinate);
}

export function filterValidMarkers(markers: MapMarker[]): MapMarker[] {
  return markers.filter((m) => isValidCoordinate(m.coordinate));
}

export function filterValidRoutes(routes: MapRoute[]): MapRoute[] {
  return routes
    .map((route) => ({
      ...route,
      coordinates: filterValidCoordinates(route.coordinates),
    }))
    .filter((route) => route.coordinates.length >= 2);
}

/**
 * Downsample dense GPS trails for polyline rendering.
 * Keeps first/last points and evenly samples the middle.
 */
export function downsampleCoordinates(
  coords: MapCoordinate[],
  maxPoints: number = MAX_ROUTE_POINTS,
): MapCoordinate[] {
  if (coords.length <= maxPoints) return coords;
  const result: MapCoordinate[] = [coords[0]];
  const step = (coords.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i += 1) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

export type LngLatBounds = [number, number, number, number]; // west, south, east, north

export function computeBounds(
  coordinates: MapCoordinate[],
): LngLatBounds | null {
  const valid = filterValidCoordinates(coordinates);
  if (valid.length === 0) return null;

  let west = valid[0].longitude;
  let east = valid[0].longitude;
  let south = valid[0].latitude;
  let north = valid[0].latitude;

  for (const c of valid) {
    if (c.longitude < west) west = c.longitude;
    if (c.longitude > east) east = c.longitude;
    if (c.latitude < south) south = c.latitude;
    if (c.latitude > north) north = c.latitude;
  }

  // Pad tiny/single-point bounds so the camera doesn't zoom too hard
  if (Math.abs(east - west) < 0.0005) {
    west -= 0.002;
    east += 0.002;
  }
  if (Math.abs(north - south) < 0.0005) {
    south -= 0.002;
    north += 0.002;
  }

  return [west, south, east, north];
}

export function collectMapCoordinates(params: {
  markers?: MapMarker[];
  routes?: MapRoute[];
  currentLocation?: MapCoordinate | null;
}): MapCoordinate[] {
  const coords: MapCoordinate[] = [];
  for (const marker of params.markers ?? []) {
    if (isValidCoordinate(marker.coordinate)) coords.push(marker.coordinate);
  }
  for (const route of params.routes ?? []) {
    coords.push(...filterValidCoordinates(route.coordinates));
  }
  if (isValidCoordinate(params.currentLocation)) {
    coords.push(params.currentLocation);
  }
  return coords;
}

export function mergePadding(
  padding?: Partial<MapCameraPadding>,
): MapCameraPadding {
  return {
    top: padding?.top ?? MAP_DEFAULT_PADDING.top,
    right: padding?.right ?? MAP_DEFAULT_PADDING.right,
    bottom: padding?.bottom ?? MAP_DEFAULT_PADDING.bottom,
    left: padding?.left ?? MAP_DEFAULT_PADDING.left,
  };
}

export function routesToLineFeatureCollection(
  routes: MapRoute[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: filterValidRoutes(routes).map((route) => ({
      type: 'Feature',
      id: route.id,
      properties: {
        id: route.id,
        type: route.type ?? 'historical',
        color: route.color ?? null,
        width: route.width ?? 4,
        title: route.title ?? null,
      },
      geometry: {
        type: 'LineString',
        coordinates: downsampleCoordinates(route.coordinates).map(toLngLat),
      },
    })),
  };
}
