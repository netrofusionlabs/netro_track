import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { useLiveTeamLocations } from './hooks/useTracking';
import { connectSocket } from '../../shared/services/socketService';
import { IconButton, EmptyState, ErrorState } from '../../shared/components';
import { NetroMap } from '../../shared/components/map';
import { liveLocationsToMarkers } from './adapters/mapDataAdapter';
import type { LiveLocationPoint } from './types';

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
    companyId: existing[idx]?.companyId ?? '',
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

    // Mobile socket events (see docs/backend/socket-events.md + existing app wiring)
    socket.on('location:employee', onLocation);
    socket.on('employee:status', onStatus);

    return () => {
      socket.off('location:employee', onLocation);
      socket.off('employee:status', onStatus);
    };
  }, []);

  const markers = useMemo(
    () =>
      liveLocationsToMarkers(livePoints, {
        selectedUserId,
        statusByUserId: statusMap,
      }),
    [livePoints, selectedUserId, statusMap],
  );

  const handleMarkerPress = useCallback((marker: { metadata?: Record<string, unknown>; id: string }) => {
    const userId = typeof marker.metadata?.userId === 'string'
      ? marker.metadata.userId
      : marker.id.replace(/^live-/, '');
    setSelectedUserId((prev) => (prev === userId ? null : userId));
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Live Map</Text>
          <Text style={[typography.bodySm, styles.subtitle, { color: theme.colors.text.secondary }]}>
            {livePoints.length} agent{livePoints.length !== 1 ? 's' : ''} active in field
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="refresh" onPress={() => { refetch().catch(() => undefined); }} variant="default" size="md" />
        </View>
      </View>

      {error && livePoints.length === 0 ? (
        <ErrorState message={(error as Error).message} onRetry={() => { refetch().catch(() => undefined); }} />
      ) : null}

      {!isLoading && !error && livePoints.length === 0 ? (
        <EmptyState
          icon="teamMap"
          title="No Agents Active"
          subtitle="No agents currently tracked. Agents appear here once they punch in."
        />
      ) : (
        <View style={styles.mapWrap}>
          <NetroMap
            markers={markers}
            fitToCoordinates
            showControls
            loading={isLoading && livePoints.length === 0}
            onMarkerPress={handleMarkerPress}
            padding={{ top: 48, right: 40, bottom: 100, left: 40 }}
          />

          <View
            style={[
              styles.legend,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.surface.border,
              },
            ]}
          >
            <LegendDot color="#22C55E" label="< 5 min" />
            <LegendDot color="#EAB308" label="5–15 min" />
            <LegendDot color="#EF4444" label="Offline / > 15 min" />
          </View>
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>{label}</Text>
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
  subtitle: { marginTop: 2 },
  mapWrap: { flex: 1 },
  legend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },
});
