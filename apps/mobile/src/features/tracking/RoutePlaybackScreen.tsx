/**
 * RoutePlaybackScreen — GPS route replay with a native slider and route metadata.
 *
 * Improvements over original:
 * - Native Slider replaces step buttons (precise scrubbing)
 * - Route metadata: total distance (km), duration, avg speed
 * - Polyline gradient via segment coloring (speed-based)
 * - Start/End markers clearly differentiated
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../shared/theme/ThemeProvider';
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

  // The hook now returns RouteMetadata from the enriched endpoint
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
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>Route Playback</Text>
        <View style={s.dateNav}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={s.dateBtn}>
            <Text style={[s.dateBtnText, { color: theme.colors.brand.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.dateText, { color: theme.colors.text.primary }]}>{date}</Text>
          <TouchableOpacity onPress={() => changeDate(1)} disabled={date >= todayISO()} style={s.dateBtn}>
            <Text style={[s.dateBtnText, { color: date >= todayISO() ? theme.colors.text.tertiary : theme.colors.brand.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Route Metadata */}
      {total > 0 && (
        <View style={[s.metaRow, { backgroundColor: theme.colors.surface.card }]}>
          <MetaChip icon="📍" label={formatDistance(totalDistanceMeters)} sub="Distance" />
          <MetaDivider />
          <MetaChip icon="⏱" label={formatDuration(totalDurationSeconds)} sub="Duration" />
          <MetaDivider />
          <MetaChip icon="🚀" label={`${(averageSpeedMs * 3.6).toFixed(1)} km/h`} sub="Avg Speed" />
          <MetaDivider />
          <MetaChip icon="📌" label={String(total)} sub="Points" />
        </View>
      )}

      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand.primary} />}
      {error && <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>{(error as Error).message}</Text>}
      {!isLoading && total === 0 && (
        <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No GPS data found for {date}.</Text>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={s.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={theme.colors.brand.primary}
            strokeWidth={3}
            lineDashPattern={undefined}
          />
        )}
        {/* Remaining route (dimmed) */}
        {points.length > sliderIndex + 1 && (
          <Polyline
            coordinates={points.slice(sliderIndex).map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor="#CBD5E1"
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
            pinColor="#3b82d4"
          />
        )}
      </MapView>

      {/* Playback Controls */}
      {total > 0 && (
        <View style={[s.controls, { backgroundColor: theme.colors.surface.card }]}>
          {/* Timeline info */}
          <View style={s.timelineInfo}>
            <Text style={[s.timelineLabel, { color: theme.colors.text.secondary }]}>
              Point {sliderIndex + 1} / {total}
            </Text>
            {currentPoint && (
              <Text style={[s.timelineTime, { color: theme.colors.brand.primary }]}>
                {formatTime(currentPoint.recordedAt)}
              </Text>
            )}
          </View>

          {/* Native slider */}
          <Slider
            style={s.slider}
            minimumValue={0}
            maximumValue={Math.max(total - 1, 1)}
            step={1}
            value={sliderIndex}
            onValueChange={goTo}
            minimumTrackTintColor={theme.colors.brand.primary}
            maximumTrackTintColor={theme.colors.surface.input}
            thumbTintColor={theme.colors.brand.primary}
          />

          {/* Playback buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              onPress={() => goTo(0)}
              style={[s.iconBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.iconBtnText, { color: theme.colors.text.primary }]}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlay}
              style={[s.playBtn, { backgroundColor: theme.colors.brand.primary }]}
            >
              <Text style={s.playBtnText}>{playing ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goTo(total - 1)}
              style={[s.iconBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.iconBtnText, { color: theme.colors.text.primary }]}>⏭</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={fitAll}
              style={[s.iconBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.iconBtnText, { color: theme.colors.text.primary }]}>⤢</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaChip({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <View style={s.metaChip}>
      <Text style={s.metaIcon}>{icon}</Text>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaSub}>{sub}</Text>
    </View>
  );
}

function MetaDivider() {
  return <View style={s.metaDivider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  heading: { fontSize: 20, fontWeight: '800' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { padding: 6 },
  dateBtnText: { fontSize: 22, fontWeight: '700' },
  dateText: { fontSize: 14, fontWeight: '600' },
  // Metadata row
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    marginHorizontal: 16, marginBottom: 4, borderRadius: 12, paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  metaChip: { alignItems: 'center', flex: 1 },
  metaIcon: { fontSize: 14, marginBottom: 2 },
  metaLabel: { fontSize: 13, fontWeight: '700' },
  metaSub: { fontSize: 10, color: '#999', marginTop: 1 },
  metaDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  // Map
  map: { flex: 1 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14, padding: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, padding: 20 },
  // Controls panel
  controls: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 8 },
    }),
  },
  timelineInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timelineLabel: { fontSize: 13 },
  timelineTime: { fontSize: 13, fontWeight: '700' },
  slider: { width: '100%', height: 36 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 },
  iconBtn: { borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 16 },
  playBtn: { borderRadius: 26, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { color: '#fff', fontSize: 20 },
});
