/**
 * TeamMapScreen — Live map showing each team member's latest location.
 * Available to MANAGER and COMPANY_ADMIN roles.
 *
 * Improvements over original:
 * - Employee names shown (not truncated userId)
 * - Color-coded status rings: green < 5 min, yellow 5-15 min, red > 15 min / offline
 * - employee:status socket events update presence in real time
 * - Custom SVG callout with name, battery, and last-seen time
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useLiveTeamLocations } from './hooks/useTracking';
import { connectSocket, getSocket } from '../../shared/services/socketService';
import type { LiveLocationPoint } from './types';

// ─── Status ring helpers ──────────────────────────────────────────────────────

function getStatusColor(recordedAt: string, isOffline: boolean): string {
  if (isOffline) return '#EF4444'; // red
  const ageMs = Date.now() - new Date(recordedAt).getTime();
  if (ageMs < 5 * 60 * 1000) return '#22C55E';  // green < 5 min
  if (ageMs < 15 * 60 * 1000) return '#EAB308'; // yellow 5-15 min
  return '#EF4444'; // red > 15 min
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

// ─── Local state types ────────────────────────────────────────────────────────

interface EmployeeStatusMap {
  [userId: string]: 'WORKING' | 'OFFLINE';
}

interface SocketLocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  recordedAt?: string;
  serverTimestamp: string;
}

interface SocketStatusUpdate {
  userId: string;
  status: 'WORKING' | 'OFFLINE';
}

function mergeUpdate(
  existing: LiveLocationPoint[],
  update: SocketLocationUpdate,
): LiveLocationPoint[] {
  const idx = existing.findIndex((p) => p.userId === update.userId);
  const merged: LiveLocationPoint = {
    id: `live-${update.userId}`,
    userId: update.userId,
    userName: existing[idx]?.userName ?? 'Unknown',
    companyId: '',
    latitude: update.latitude,
    longitude: update.longitude,
    accuracy: update.accuracy ?? null,
    speed: null,
    batteryLevel: update.batteryLevel ?? null,
    recordedAt: update.recordedAt ?? update.serverTimestamp,
    isStale: false,
  };
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = merged;
    return copy;
  }
  return [...existing, merged];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamMapScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const { data: restPoints = [], isLoading, error, refetch } = useLiveTeamLocations();
  const [livePoints, setLivePoints] = useState<LiveLocationPoint[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<EmployeeStatusMap>({});

  // Seed from REST data on first load / refetch
  useEffect(() => {
    if (restPoints.length > 0) {
      setLivePoints(restPoints);
    }
  }, [restPoints]);

  // Subscribe to Socket.IO for real-time location + status updates
  useEffect(() => {
    const socket = connectSocket();

    const onLocation = (update: SocketLocationUpdate) => {
      setLivePoints((prev) => mergeUpdate(prev, update));
    };

    const onStatus = (update: SocketStatusUpdate) => {
      setStatusMap((prev) => ({ ...prev, [update.userId]: update.status }));
    };

    socket.on('location:employee', onLocation);
    socket.on('employee:status', onStatus);

    return () => {
      socket.off('location:employee', onLocation);
      socket.off('employee:status', onStatus);
    };
  }, []);

  const handleMarkerPress = useCallback((userId: string) => {
    setSelectedUserId((prev) => (prev === userId ? null : userId));
  }, []);

  const fitAll = useCallback(() => {
    if (!mapRef.current || livePoints.length === 0) return;
    mapRef.current.fitToCoordinates(
      livePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 60, right: 40, bottom: 100, left: 40 }, animated: true }
    );
  }, [livePoints]);

  const selectedPoint = livePoints.find((p) => p.userId === selectedUserId);

  const initialRegion = livePoints.length > 0
    ? { latitude: livePoints[0].latitude, longitude: livePoints[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.heading, { color: theme.colors.text.primary }]}>Live Map</Text>
          <Text style={[s.sub, { color: theme.colors.text.secondary }]}>
            {livePoints.length} agent{livePoints.length !== 1 ? 's' : ''} in field
          </Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[s.actionBtn, { borderColor: theme.colors.surface.input }]}
          >
            <Text style={[s.actionBtnText, { color: theme.colors.text.secondary }]}>↻ Refresh</Text>
          </TouchableOpacity>
          {livePoints.length > 0 && (
            <TouchableOpacity
              onPress={fitAll}
              style={[s.actionBtn, { borderColor: theme.colors.brand.primary }]}
            >
              <Text style={[s.actionBtnText, { color: theme.colors.brand.primary }]}>Fit All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && livePoints.length === 0 && (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
      )}
      {error && livePoints.length === 0 && (
        <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>{(error as Error).message}</Text>
      )}
      {!isLoading && livePoints.length === 0 && (
        <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>
          No agents currently tracked. Agents appear here once they punch in.
        </Text>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={s.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass
        showsScale
      >
        {livePoints.map((point) => {
          const isOffline = statusMap[point.userId] === 'OFFLINE';
          const statusColor = getStatusColor(point.recordedAt, isOffline);
          const initials = getInitials(point.userName ?? point.userId.slice(0, 6));
          const isSelected = selectedUserId === point.userId;

          return (
            <Marker
              key={point.userId}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              onPress={() => handleMarkerPress(point.userId)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {/* Custom marker: initials badge with status ring */}
              <View style={[s.markerOuter, { borderColor: statusColor, transform: [{ scale: isSelected ? 1.2 : 1 }] }]}>
                <View style={[s.markerInner, { backgroundColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.card }]}>
                  <Text style={[s.markerInitials, { color: isSelected ? '#fff' : theme.colors.text.primary }]}>
                    {initials}
                  </Text>
                </View>
              </View>

              {/* Callout popup */}
              <Callout tooltip={false}>
                <View style={s.callout}>
                  <Text style={s.calloutName}>{point.userName ?? 'Agent'}</Text>
                  <Text style={s.calloutMeta}>
                    🕐 {new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {point.batteryLevel != null && (
                    <Text style={s.calloutMeta}>🔋 {point.batteryLevel}%</Text>
                  )}
                  <Text style={s.calloutMeta}>
                    ● {isOffline ? 'Offline' : 'Active'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend */}
      <View style={[s.legend, { backgroundColor: theme.colors.surface.card }]}>
        <LegendDot color="#22C55E" label="< 5 min" />
        <LegendDot color="#EAB308" label="5–15 min" />
        <LegendDot color="#EF4444" label="Offline / > 15 min" />
      </View>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 12
  },
  heading: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  map: { flex: 1 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14, padding: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, padding: 20 },
  // Marker
  markerOuter: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 }
    })
  },
  markerInner: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  markerInitials: { fontSize: 13, fontWeight: '800' },
  // Callout
  callout: { padding: 10, minWidth: 120 },
  calloutName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  calloutMeta: { fontSize: 12, color: '#666', marginBottom: 2 },
  // Legend
  legend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 16,
    left: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 }
    })
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#666' },
});
