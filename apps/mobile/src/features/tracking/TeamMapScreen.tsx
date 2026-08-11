import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { useLiveTeamLocations } from './hooks/useTracking';
import { connectSocket } from '../../shared/services/socketService';
import { AppIcon, IconButton, Badge, EmptyState, ErrorState } from '../../shared/components';
import type { LiveLocationPoint } from './types';

function getStatusColor(recordedAt: string, isOffline: boolean): string {
  if (isOffline) return '#EF4444';
  const ageMs = Date.now() - new Date(recordedAt).getTime();
  if (ageMs < 5 * 60 * 1000) return '#22C55E';
  if (ageMs < 15 * 60 * 1000) return '#EAB308';
  return '#EF4444';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

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

export function TeamMapScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const { data: restPoints = [], isLoading, error, refetch } = useLiveTeamLocations();
  const [livePoints, setLivePoints] = useState<LiveLocationPoint[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<EmployeeStatusMap>({});

  useEffect(() => {
    if (restPoints.length > 0) {
      setLivePoints(restPoints);
    }
  }, [restPoints]);

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

  const initialRegion = livePoints.length > 0
    ? { latitude: livePoints[0].latitude, longitude: livePoints[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Live Map</Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
            {livePoints.length} agent{livePoints.length !== 1 ? 's' : ''} active in field
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="refresh" onPress={() => void refetch()} variant="default" size="md" />
          {livePoints.length > 0 && (
            <IconButton icon="maximize" onPress={fitAll} variant="primary" size="md" />
          )}
        </View>
      </View>

      {isLoading && livePoints.length === 0 && (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
      )}
      {error && livePoints.length === 0 && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}
      {!isLoading && livePoints.length === 0 && (
        <EmptyState
          icon="teamMap"
          title="No Agents Active"
          subtitle="No agents currently tracked. Agents appear here once they punch in."
        />
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
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
              <View style={[styles.markerOuter, { borderColor: statusColor, transform: [{ scale: isSelected ? 1.15 : 1 }] }]}>
                <View style={[styles.markerInner, { backgroundColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.card }]}>
                  <Text style={[styles.markerInitials, { color: isSelected ? '#FFFFFF' : theme.colors.text.primary }]}>
                    {initials}
                  </Text>
                </View>
              </View>

              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{point.userName ?? 'Agent'}</Text>
                  <Text style={styles.calloutMeta}>
                    Last Seen: {new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {point.batteryLevel != null && (
                    <Text style={styles.calloutMeta}>Battery: {point.batteryLevel}%</Text>
                  )}
                  <Text style={styles.calloutMeta}>
                    Status: {isOffline ? 'Offline' : 'Active'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border, borderWidth: 1 }]}>
        <LegendDot color="#22C55E" label="< 5 min" />
        <LegendDot color="#EAB308" label="5–15 min" />
        <LegendDot color="#EF4444" label="Offline / > 15 min" />
      </View>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  map: { flex: 1 },
  markerOuter: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  markerInner: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  markerInitials: { fontSize: 12, fontWeight: '700' },
  callout: { padding: 8, minWidth: 120 },
  calloutName: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  calloutMeta: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  legend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#475569', fontWeight: '500' },
});
