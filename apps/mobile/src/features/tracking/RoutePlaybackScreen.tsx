import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { AppIcon, IconButton, Card, EmptyState, ErrorState } from '../../shared/components';
import { useGpsRoute } from './hooks/useTracking';
import type { GpsRoutePoint } from './types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
  return `${metres} m`;
}

interface Props {
  userId?: string;
}

export function RoutePlaybackScreen({ userId = '' }: Props) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const [date, setDate] = useState(todayISO());
  const [sliderIndex, setSliderIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: routeData, isLoading, error } = useGpsRoute(userId, date);

  const points: GpsRoutePoint[] = (routeData as { points?: GpsRoutePoint[] })?.points ?? (Array.isArray(routeData) ? (routeData as GpsRoutePoint[]) : []);
  const totalDistanceMeters: number = (routeData as { totalDistanceMeters?: number })?.totalDistanceMeters ?? 0;
  const totalDurationSeconds: number = (routeData as { totalDurationSeconds?: number })?.totalDurationSeconds ?? 0;
  const averageSpeedMs: number = (routeData as { averageSpeedMs?: number })?.averageSpeedMs ?? 0;

  const total = points.length;
  const currentPoint: GpsRoutePoint | undefined = points[sliderIndex];
  const routeCoords = points.slice(0, sliderIndex + 1).map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(Math.round(idx), total - 1));
    setSliderIndex(clamped);
    if (points[clamped] && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: points[clamped].latitude,
        longitude: points[clamped].longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 250);
    }
  }, [total, points]);

  const togglePlay = useCallback(() => {
    if (playing) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    let idx = sliderIndex;
    playTimerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= total) {
        if (playTimerRef.current) clearInterval(playTimerRef.current);
        setPlaying(false);
        return;
      }
      goTo(idx);
    }, 250);
  }, [playing, sliderIndex, total, goTo]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(
      points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 60, right: 40, bottom: 200, left: 40 }, animated: true }
    );
  }, [points]);

  const changeDate = (direction: 1 | -1) => {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    setDate(d.toISOString().split('T')[0]);
    setSliderIndex(0);
    setPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
  };

  const initialRegion = points.length > 0
    ? { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Route Playback</Text>
        <View style={styles.dateNav}>
          <IconButton icon="chevronLeft" onPress={() => changeDate(-1)} variant="ghost" size="sm" />
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>{date}</Text>
          <IconButton
            icon="chevronRight"
            onPress={() => changeDate(1)}
            disabled={date >= todayISO()}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>

      {/* Route Metadata Header Card */}
      {total > 0 && (
        <Card variant="elevated" style={styles.metaRow}>
          <MetaChip icon="mapPin" label={formatDistance(totalDistanceMeters)} sub="Distance" />
          <View style={[styles.metaDivider, { backgroundColor: theme.colors.surface.divider }]} />
          <MetaChip icon="clock" label={formatDuration(totalDurationSeconds)} sub="Duration" />
          <View style={[styles.metaDivider, { backgroundColor: theme.colors.surface.divider }]} />
          <MetaChip icon="visits" label={`${(averageSpeedMs * 3.6).toFixed(1)} km/h`} sub="Avg Speed" />
          <View style={[styles.metaDivider, { backgroundColor: theme.colors.surface.divider }]} />
          <MetaChip icon="locationPin" label={String(total)} sub="Points" />
        </Card>
      )}

      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand.primary} size="large" />}
      {error && <ErrorState message={(error as Error).message} />}
      {!isLoading && total === 0 && (
        <EmptyState
          icon="teamMap"
          title="No Route Data"
          subtitle={`No GPS data recorded for ${date}.`}
        />
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={theme.colors.brand.primary}
            strokeWidth={4}
          />
        )}
        {points.length > sliderIndex + 1 && (
          <Polyline
            coordinates={points.slice(sliderIndex).map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor={theme.colors.text.muted}
            strokeWidth={2}
          />
        )}
        {points.length > 0 && (
          <Marker coordinate={{ latitude: points[0].latitude, longitude: points[0].longitude }} title="Start" pinColor="green" />
        )}
        {points.length > 1 && sliderIndex === total - 1 && (
          <Marker coordinate={{ latitude: points[total - 1].latitude, longitude: points[total - 1].longitude }} title="End" pinColor="red" />
        )}
        {currentPoint && sliderIndex > 0 && sliderIndex < total - 1 && (
          <Marker
            coordinate={{ latitude: currentPoint.latitude, longitude: currentPoint.longitude }}
            title={`${sliderIndex + 1} / ${total}`}
            description={formatTime(currentPoint.recordedAt)}
            pinColor="#1E40AF"
          />
        )}
      </MapView>

      {/* Playback Controls */}
      {total > 0 && (
        <Card variant="elevated" style={styles.controls}>
          <View style={styles.timelineInfo}>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
              Point {sliderIndex + 1} / {total}
            </Text>
            {currentPoint && (
              <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                {formatTime(currentPoint.recordedAt)}
              </Text>
            )}
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(total - 1, 1)}
            step={1}
            value={sliderIndex}
            onValueChange={goTo}
            minimumTrackTintColor={theme.colors.brand.primary}
            maximumTrackTintColor={theme.colors.surface.subtle}
            thumbTintColor={theme.colors.brand.primary}
          />

          <View style={styles.btnRow}>
            <IconButton icon="skipBack" onPress={() => goTo(0)} variant="default" size="md" />
            <IconButton
              icon={playing ? 'pause' : 'play'}
              onPress={togglePlay}
              variant="primary"
              size="lg"
            />
            <IconButton icon="skipForward" onPress={() => goTo(total - 1)} variant="default" size="md" />
            <IconButton icon="maximize" onPress={fitAll} variant="default" size="md" />
          </View>
        </Card>
      )}
    </SafeAreaView>
  );
}

function MetaChip({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaChip}>
      <AppIcon name={icon} color={theme.colors.brand.primary} size={16} />
      <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 2 }]}>{label}</Text>
      <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>{sub}</Text>
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
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
  },
  metaChip: { alignItems: 'center', flex: 1 },
  metaDivider: { width: 1, height: 28 },
  map: { flex: 1 },
  controls: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 12,
    padding: 14,
  },
  timelineInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  slider: { width: '100%', height: 36 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 4 },
});
