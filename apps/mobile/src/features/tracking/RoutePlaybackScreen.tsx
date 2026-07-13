/**
 * RoutePlaybackScreen — Shows an employee's GPS route for a selected date
 * with a timeline slider to scrub through waypoints.
 *
 * Available to MANAGER and COMPANY_ADMIN roles.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useGpsRoute } from './hooks/useTracking';
import type { GpsRoutePoint } from './types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface Props {
  /** The userId to display route for. Passed from navigation params or defaults to current user. */
  userId?: string;
}

export function RoutePlaybackScreen({ userId = '' }: Props) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const [date, setDate] = useState(todayISO());
  const [sliderIndex, setSliderIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: points = [], isLoading, error } = useGpsRoute(userId, date);

  const total = points.length;
  const currentPoint: GpsRoutePoint | undefined = points[sliderIndex];
  const routeCoords = points.slice(0, sliderIndex + 1).map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude
  }));

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    setSliderIndex(clamped);
    if (points[clamped] && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: points[clamped].latitude,
        longitude: points[clamped].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 300);
    }
  }, [total, points]);

  const startPlay = useCallback(() => {
    if (playing) {
      clearInterval(playTimerRef.current!);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    let idx = sliderIndex;
    playTimerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= total) {
        clearInterval(playTimerRef.current!);
        setPlaying(false);
        return;
      }
      goTo(idx);
    }, 300); // 300ms per point = fast visual playback
  }, [playing, sliderIndex, total, goTo]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(
      points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 60, right: 40, bottom: 40, left: 40 }, animated: true }
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
          <TouchableOpacity
            onPress={() => changeDate(1)}
            disabled={date >= todayISO()}
            style={s.dateBtn}
          >
            <Text style={[s.dateBtnText, { color: date >= todayISO() ? theme.colors.text.tertiary : theme.colors.brand.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading / error */}
      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand.primary} />}
      {error && (
        <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>
          {(error as Error).message}
        </Text>
      )}
      {!isLoading && points.length === 0 && (
        <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>
          No GPS data found for {date}.
        </Text>
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
          />
        )}
        {/* Start marker */}
        {points.length > 0 && (
          <Marker
            coordinate={{ latitude: points[0].latitude, longitude: points[0].longitude }}
            title="Start"
            pinColor="green"
          />
        )}
        {/* Current playback position */}
        {currentPoint && (
          <Marker
            coordinate={{ latitude: currentPoint.latitude, longitude: currentPoint.longitude }}
            title={`Point ${sliderIndex + 1}/${total}`}
            description={formatTime(currentPoint.recordedAt)}
            pinColor="#3b82d4"
          />
        )}
      </MapView>

      {/* Playback controls (visible only when there are points) */}
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

          {/* Simple step slider using touch buttons */}
          <View style={s.sliderRow}>
            <TouchableOpacity
              onPress={() => goTo(0)}
              style={[s.sliderBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.sliderBtnText, { color: theme.colors.text.primary }]}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goTo(sliderIndex - 10)}
              style={[s.sliderBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.sliderBtnText, { color: theme.colors.text.primary }]}>−10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={startPlay}
              style={[s.playBtn, { backgroundColor: theme.colors.brand.primary }]}
            >
              <Text style={s.playBtnText}>{playing ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goTo(sliderIndex + 10)}
              style={[s.sliderBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.sliderBtnText, { color: theme.colors.text.primary }]}>+10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goTo(total - 1)}
              style={[s.sliderBtn, { backgroundColor: theme.colors.surface.input }]}
            >
              <Text style={[s.sliderBtnText, { color: theme.colors.text.primary }]}>⏭</Text>
            </TouchableOpacity>
          </View>

          {/* Fit all button */}
          <TouchableOpacity onPress={fitAll} style={[s.fitBtn, { borderColor: theme.colors.surface.input }]}>
            <Text style={[s.fitBtnText, { color: theme.colors.text.secondary }]}>Fit Route</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12
  },
  heading: { fontSize: 20, fontWeight: '800' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { padding: 6 },
  dateBtnText: { fontSize: 22, fontWeight: '700' },
  dateText: { fontSize: 14, fontWeight: '600' },
  map: { flex: 1 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14, padding: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, padding: 20 },
  controls: {
    paddingHorizontal: 16, paddingVertical: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 8 }
    })
  },
  timelineInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timelineLabel: { fontSize: 13 },
  timelineTime: { fontSize: 13, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  sliderBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  sliderBtnText: { fontSize: 13, fontWeight: '600' },
  playBtn: { borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { color: '#fff', fontSize: 18 },
  fitBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  fitBtnText: { fontSize: 13 }
});
