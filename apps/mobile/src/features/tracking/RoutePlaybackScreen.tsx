import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { AppIcon, IconButton, Card, EmptyState, ErrorState, Badge } from '../../shared/components';
import { NetroMap } from '../../shared/components/map';
import { useGpsRoute } from './hooks/useTracking';
import { routeDataToMapData } from './adapters/mapDataAdapter';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';
import type { AppIconName } from '../../shared/components/AppIcon';

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

interface RouteParams {
  userId?: string;
  date?: string;
  attendanceId?: string;
  startAt?: string;
  endAt?: string | null;
  sessionLabel?: string;
  mode?: 'session' | 'day';
}

interface Props {
  route?: { params?: RouteParams };
  navigation?: {
    canGoBack?: () => boolean;
    goBack?: () => void;
  };
}

export function RoutePlaybackScreen({ route, navigation }: Props = {}) {
  const theme = useTheme();

  const paramDate = route?.params?.date ?? todayISO();
  const userId = route?.params?.userId ?? '';
  const attendanceId = route?.params?.attendanceId;
  const startAt = route?.params?.startAt;
  const endAt = route?.params?.endAt ?? null;
  const sessionLabel = route?.params?.sessionLabel;
  const mode = route?.params?.mode ?? (attendanceId || startAt ? 'session' : 'day');

  const [date, setDate] = useState(paramDate);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDate(paramDate);
  }, [paramDate, userId, attendanceId, startAt, endAt]);

  const { data: routeData, isLoading, error, refetch } = useGpsRoute(userId, date);

  useRefreshOnFocus(refetch);

  const sessionFilter = useMemo(() => {
    if (mode !== 'session') return null;
    return {
      attendanceId,
      startAt,
      endAt,
    };
  }, [mode, attendanceId, startAt, endAt]);

  const mapData = useMemo(
    () =>
      routeDataToMapData(routeData, {
        cursorIndex: sliderIndex,
        routeId: `user-${userId}-${date}-${mode}-${attendanceId ?? 'day'}`,
        filter: sessionFilter,
      }),
    [routeData, sliderIndex, userId, date, mode, attendanceId, sessionFilter],
  );

  const points = mapData.points;
  const total = points.length;
  const currentPoint = points[sliderIndex];
  const { totalDistanceMeters, totalDurationSeconds, averageSpeedMs } = mapData.meta;

  useEffect(() => {
    // Start at the end so the full path + end marker are visible immediately
    setSliderIndex(Math.max(total - 1, 0));
    setPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
  }, [date, userId, routeData, attendanceId, startAt, endAt, total]);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(Math.round(idx), Math.max(total - 1, 0)));
    setSliderIndex(clamped);
  }, [total]);

  const togglePlay = useCallback(() => {
    if (playing) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    let idx = sliderIndex >= total - 1 ? 0 : sliderIndex;
    if (sliderIndex >= total - 1) {
      setSliderIndex(0);
      idx = 0;
    }
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

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  const changeDate = (direction: 1 | -1) => {
    // Session routes are tied to a fixed window — date nav only for day mode
    if (mode === 'session') return;
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    setDate(d.toISOString().split('T')[0]);
  };

  const title = mode === 'session' ? 'Session Route' : 'Day Route';

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {navigation?.canGoBack?.() ? (
            <IconButton
              icon="chevronLeft"
              onPress={() => navigation.goBack?.()}
              variant="ghost"
              size="sm"
            />
          ) : null}
          <View>
            <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>{title}</Text>
            {sessionLabel ? (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                {sessionLabel}
              </Text>
            ) : null}
          </View>
        </View>
        {mode === 'day' ? (
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
        ) : (
          <Badge label={date} variant="info" size="sm" />
        )}
      </View>

      {total > 0 && (
        <Card variant="elevated" style={styles.metaRow}>
          <MetaChip icon="mapPin" label={formatDistance(totalDistanceMeters)} sub="Distance" />
          <View style={[styles.metaDivider, { backgroundColor: theme.colors.surface.divider }]} />
          <MetaChip icon="clock" label={formatDuration(totalDurationSeconds)} sub="Duration" />
          <View style={[styles.metaDivider, { backgroundColor: theme.colors.surface.divider }]} />
          <MetaChip icon="visits" label={`${(averageSpeedMs * 3.6).toFixed(1)} km/h`} sub="Avg Speed" />
        </Card>
      )}

      {error ? <ErrorState message={(error as Error).message} /> : null}
      {!isLoading && !error && total === 0 ? (
        <EmptyState
          icon="teamMap"
          title="No Route Data"
          subtitle={
            userId
              ? mode === 'session'
                ? 'No GPS points found for this attendance session.'
                : `No GPS data recorded for ${date}.`
              : 'Select an employee to view route history.'
          }
        />
      ) : (
        <NetroMap
          markers={mapData.markers}
          routes={mapData.routes}
          currentLocation={
            currentPoint
              ? { latitude: Number(currentPoint.latitude), longitude: Number(currentPoint.longitude) }
              : null
          }
          fitToCoordinates
          showControls
          loading={isLoading}
          padding={{ top: 48, right: 40, bottom: 220, left: 40 }}
          style={styles.map}
        />
      )}

      {total > 0 && (
        <Card variant="elevated" style={styles.controls}>
          <View style={styles.timelineInfo}>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
              Playback
            </Text>
            {currentPoint ? (
              <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                {formatTime(currentPoint.recordedAt)}
              </Text>
            ) : null}
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
          </View>
        </Card>
      )}
    </View>
  );
}

function MetaChip({ icon, label, sub }: { icon: AppIconName; label: string; sub: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaChip}>
      <AppIcon name={icon} color={theme.colors.brand.primary} size={16} />
      <Text style={[typography.headingSm, styles.metaLabel, { color: theme.colors.text.primary }]}>{label}</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
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
  metaLabel: { marginTop: 2 },
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
