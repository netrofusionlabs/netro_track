import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
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
    <Card style={{ paddingVertical: 16, paddingHorizontal: 18 }}>
      <View style={s.row}>
        <View style={s.rowLeft}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
            {formatDate(record.punchInTime)}
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {formatTime(record.punchInTime)} → {formatTime(record.punchOutTime)}
          </Text>
        </View>
        <View style={s.rowRight}>
          <Text style={[typography.headingMd, { color: complete ? theme.colors.semantic.success : theme.colors.semantic.warning }]}>
            {formatHours(record.workingHours)}
          </Text>
          <Text style={[typography.caption, { color: complete ? theme.colors.semantic.success : theme.colors.semantic.warning, marginTop: 2 }]}>
            {complete ? 'Complete' : 'Active'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function AttendanceHistoryScreen() {
  const theme = useTheme();
  const { data: records = [], isLoading, error } = useAttendanceHistory();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="History"
          subtitle="Last 30 attendance records"
        />

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {error && (
          <Text style={[typography.bodyMd, { color: theme.colors.semantic.error, textAlign: 'center', marginTop: 20 }]}>
            {(error as Error).message}
          </Text>
        )}
        {!isLoading && records.length === 0 && (
          <EmptyState
            icon="📋"
            title="No Attendance Records"
            subtitle="Your attendance history will appear here once you start punching in."
          />
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
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: 'flex-end' },
});
