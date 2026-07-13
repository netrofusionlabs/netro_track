/**
 * TeamMapScreen — Live map showing each team member's latest location.
 * Available to MANAGER and COMPANY_ADMIN roles.
 *
 * Uses react-native-maps (MapView) with polling via useLiveTeamLocations.
 * Also subscribes to Socket.IO 'location:employee' events for real-time updates.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useLiveTeamLocations } from './hooks/useTracking';
import { connectSocket, getSocket } from '../../shared/services/socketService';
import type { LiveLocationPoint } from './types';

interface SocketLocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery?: number;
  serverTimestamp: string;
}

/** Merge real-time socket updates into the REST-fetched list */
function mergeUpdate(
  existing: LiveLocationPoint[],
  update: SocketLocationUpdate
): LiveLocationPoint[] {
  const idx = existing.findIndex((p) => p.userId === update.userId);
  const merged: LiveLocationPoint = {
    id: `live-${update.userId}`,
    userId: update.userId,
    companyId: '',
    latitude: update.latitude,
    longitude: update.longitude,
    accuracy: update.accuracy ?? null,
    speed: null,
    battery: update.battery ?? null,
    recordedAt: update.serverTimestamp
  };
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = merged;
    return copy;
  }
  return [...existing, merged];
}

export function TeamMapScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const { data: restPoints = [], isLoading, error, refetch } = useLiveTeamLocations();
  const [livePoints, setLivePoints] = useState<LiveLocationPoint[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Seed from REST data on first load
  useEffect(() => {
    if (restPoints.length > 0) {
      setLivePoints(restPoints);
    }
  }, [restPoints]);

  // Subscribe to Socket.IO for real-time updates
  useEffect(() => {
    const socket = connectSocket();

    const handler = (update: SocketLocationUpdate) => {
      setLivePoints((prev) => mergeUpdate(prev, update));
    };

    socket.on('location:employee', handler);

    return () => {
      socket.off('location:employee', handler);
    };
  }, []);

  const handleMarkerPress = useCallback((userId: string) => {
    setSelectedUserId((prev) => (prev === userId ? null : userId));
  }, []);

  const fitAll = useCallback(() => {
    if (!mapRef.current || livePoints.length === 0) return;
    mapRef.current.fitToCoordinates(
      livePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 60, right: 40, bottom: 40, left: 40 }, animated: true }
    );
  }, [livePoints]);

  const selectedPoint = livePoints.find((p) => p.userId === selectedUserId);

  const initialRegion = livePoints.length > 0
    ? {
        latitude: livePoints[0].latitude,
        longitude: livePoints[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <View style={s.header}>
        <View>
          <Text style={[s.heading, { color: theme.colors.text.primary }]}>Live Map</Text>
          <Text style={[s.sub, { color: theme.colors.text.secondary }]}>
            {livePoints.length} field agent{livePoints.length !== 1 ? 's' : ''} tracked
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
        <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>
          {(error as Error).message}
        </Text>
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
        {livePoints.map((point) => (
          <Marker
            key={point.userId}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.userId}
            description={`Battery: ${point.battery ?? '—'}%  ·  ${new Date(point.recordedAt).toLocaleTimeString()}`}
            pinColor={selectedUserId === point.userId ? '#e74c3c' : '#3b82d4'}
            onPress={() => handleMarkerPress(point.userId)}
          />
        ))}
      </MapView>

      {/* Selected agent info panel */}
      {selectedPoint && (
        <View style={[s.infoPanel, { backgroundColor: theme.colors.surface.card }]}>
          <Text style={[s.infoPanelTitle, { color: theme.colors.text.primary }]}>
            Agent: {selectedPoint.userId.slice(0, 8)}…
          </Text>
          <Text style={[s.infoPanelMeta, { color: theme.colors.text.secondary }]}>
            📍 {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)}
          </Text>
          <Text style={[s.infoPanelMeta, { color: theme.colors.text.secondary }]}>
            🕐 Last seen: {new Date(selectedPoint.recordedAt).toLocaleTimeString()}
          </Text>
          {selectedPoint.battery != null && (
            <Text style={[s.infoPanelMeta, { color: theme.colors.text.secondary }]}>
              🔋 Battery: {selectedPoint.battery}%
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
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
  infoPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 16,
    left: 16,
    right: 16,
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 }
    })
  },
  infoPanelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  infoPanelMeta: { fontSize: 13, marginBottom: 2 }
});
