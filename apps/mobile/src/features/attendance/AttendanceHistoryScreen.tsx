import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
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

function AttendanceRow({ record, theme }: { record: AttendanceRecord; theme: ReturnType<typeof useTheme> }) {
  const complete = !!record.punchOutTime;
  return (
    <View style={[s.row, { backgroundColor: theme.colors.surface.card }]}>
      <View style={s.rowLeft}>
        <Text style={[s.rowDate, { color: theme.colors.text.primary }]}>
          {formatDate(record.punchInTime)}
        </Text>
        <Text style={[s.rowTimes, { color: theme.colors.text.secondary }]}>
          {formatTime(record.punchInTime)} → {formatTime(record.punchOutTime)}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[s.rowHours, { color: complete ? theme.colors.semantic.success : theme.colors.semantic.warning }]}>
          {formatHours(record.workingHours)}
        </Text>
        <Text style={[s.rowStatus, { color: complete ? theme.colors.semantic.success : theme.colors.semantic.warning }]}>
          {complete ? 'Complete' : 'Active'}
        </Text>
      </View>
    </View>
  );
}

export function AttendanceHistoryScreen() {
  const theme = useTheme();
  const { data: records = [], isLoading, error } = useAttendanceHistory();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>History</Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>Last 30 attendance records</Text>

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {error && (
          <Text style={[s.error, { color: theme.colors.semantic.error }]}>{(error as Error).message}</Text>
        )}
        {!isLoading && records.length === 0 && (
          <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No attendance records yet.</Text>
        )}
        {records.map((r) => (
          <AttendanceRow key={r.id} record={r} theme={theme} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 2, marginBottom: 20 },
  error: { fontSize: 14, marginTop: 20, textAlign: 'center' },
  empty: { fontSize: 14, marginTop: 40, textAlign: 'center' },
  row: {
    borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 15, fontWeight: '700' },
  rowTimes: { fontSize: 13, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowHours: { fontSize: 16, fontWeight: '800' },
  rowStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 }
});
