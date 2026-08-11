import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  StatusBadge,
  EmptyState,
  ScreenHeader,
  ListItem,
  LoadingState,
  ErrorState,
} from '../../shared/components';
import { useAttendanceHistory } from './hooks/useAttendance';
import type { AttendanceRecord } from './types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const theme = useTheme();
  const complete = !!record.punchOutTime;

  return (
    <ListItem
      icon="clock"
      title={formatDate(record.punchInTime)}
      subtitle={`${formatTime(record.punchInTime)} → ${formatTime(record.punchOutTime)} · ${formatHours(record.workingHours)}`}
      trailing={
        <StatusBadge
          status={complete ? 'completed' : 'active'}
          label={complete ? 'Complete' : 'Active'}
        />
      }
    />
  );
}

export function AttendanceHistoryScreen() {
  const theme = useTheme();
  const { data: records = [], isLoading, error, refetch } = useAttendanceHistory();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Attendance History"
          subtitle="Last 30 attendance records"
        />

        {isLoading && <LoadingState message="Loading attendance history..." />}

        {error && (
          <ErrorState
            title="Unable to load history"
            message={(error as Error).message}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !error && records.length === 0 && (
          <EmptyState
            icon="history"
            title="No Attendance Records"
            subtitle="Your attendance history will appear here once you start punching in."
          />
        )}

        {records.map((r) => (
          <AttendanceRow key={r.id} record={r} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
});
