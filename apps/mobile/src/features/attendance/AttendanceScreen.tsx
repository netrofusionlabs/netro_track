import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useAttendanceToday, usePunchIn, usePunchOut } from './hooks/useAttendance';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export function AttendanceScreen() {
  const theme = useTheme();
  const { data: record, isLoading, error } = useAttendanceToday();
  const punchIn = usePunchIn();
  const punchOut = usePunchOut();

  const isPunchedIn = !!record && !record.punchOutTime;
  const isPunchedOut = !!record && !!record.punchOutTime;

  const handlePunch = useCallback(() => {
    // GPS coords are resolved automatically inside the mutation (trackingService.getCurrentCoords)
    if (!record) {
      punchIn.mutate(undefined, {
        onError: (err) => Alert.alert('Punch In Failed', err.message)
      });
    } else if (isPunchedIn) {
      Alert.alert('Punch Out', 'Are you sure you want to punch out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Punch Out', style: 'destructive',
          onPress: () =>
            punchOut.mutate(undefined, {
              onError: (e) => Alert.alert('Punch Out Failed', e.message)
            })
        }
      ]);
    }
  }, [record, isPunchedIn, punchIn, punchOut]);

  const isMutating = punchIn.isPending || punchOut.isPending;

  const statusColor = isPunchedIn
    ? theme.colors.semantic.success
    : isPunchedOut
    ? theme.colors.semantic.info
    : theme.colors.semantic.warning;

  const statusLabel = isPunchedIn
    ? '● Punched In'
    : isPunchedOut
    ? '✓ Day Complete'
    : '○ Not Punched In';

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>Attendance</Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>Today's record</Text>

        {/* Status card */}
        <View style={[s.card, { backgroundColor: theme.colors.surface.card }]}>
          <Text style={[s.statusLabel, { color: statusColor }]}>{statusLabel}</Text>

          {isLoading && <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.brand.primary} />}
          {error && (
            <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>
              {(error as Error).message}
            </Text>
          )}

          <View style={s.timeRow}>
            <View style={s.timeBlock}>
              <Text style={[s.timeLabel, { color: theme.colors.text.secondary }]}>Punch In</Text>
              <Text style={[s.timeVal, { color: theme.colors.text.primary }]}>
                {formatTime(record?.punchInTime)}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: theme.colors.surface.input }]} />
            <View style={s.timeBlock}>
              <Text style={[s.timeLabel, { color: theme.colors.text.secondary }]}>Punch Out</Text>
              <Text style={[s.timeVal, { color: theme.colors.text.primary }]}>
                {formatTime(record?.punchOutTime)}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: theme.colors.surface.input }]} />
            <View style={s.timeBlock}>
              <Text style={[s.timeLabel, { color: theme.colors.text.secondary }]}>Hours</Text>
              <Text style={[s.timeVal, { color: theme.colors.text.primary }]}>
                {formatHours(record?.workingHours)}
              </Text>
            </View>
          </View>

          {!isPunchedOut && (
            <TouchableOpacity
              onPress={handlePunch}
              disabled={isMutating || isLoading}
              style={[
                s.btn,
                {
                  backgroundColor: isPunchedIn
                    ? theme.colors.semantic.error
                    : theme.colors.brand.primary,
                  opacity: isMutating || isLoading ? 0.6 : 1
                }
              ]}
            >
              {isMutating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>{isPunchedIn ? 'Punch Out' : 'Punch In'}</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* GPS note */}
        <View style={[s.infoBox, { backgroundColor: theme.colors.surface.input }]}>
          <Text style={[s.infoText, { color: theme.colors.text.secondary }]}>
            📍 GPS location is captured automatically and synced to the server every 2.5 minutes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 2, marginBottom: 20 },
  card: {
    borderRadius: 14, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  statusLabel: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  errorText: { fontSize: 13, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  timeVal: { fontSize: 18, fontWeight: '700' },
  divider: { width: 1, height: 36, marginHorizontal: 4 },
  btn: {
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center'
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoBox: { borderRadius: 10, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 20 }
});
