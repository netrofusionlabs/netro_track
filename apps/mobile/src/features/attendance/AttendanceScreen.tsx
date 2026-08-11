import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { Card } from '../../shared/components/Card';
import { Divider } from '../../shared/components/Divider';
import { EmptyState } from '../../shared/components/EmptyState';
import {
  useAttendanceToday,
  useAttendanceSummary,
  usePunchIn,
  usePunchOut
} from './hooks/useAttendance';
import { requestLocationPermission } from '../../shared/utils/locationPermissions';
import { startTracking } from '../../shared/services/trackingService';

/** Safe Hermes Date Parser for ISO/SQL timestamp strings */
function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? null : d;
}

/** Safe Number parser for Prisma Decimal string responses */
function safeNum(val: number | string | null | undefined): number | null {
  if (val == null || val === '') return null;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? null : num;
}

function formatDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHours(h: number | string | null | undefined): string {
  const num = safeNum(h);
  if (num == null) return '—';
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

type FilterMode = 'monthly' | 'all' | 'today';

export function AttendanceScreen() {
  const theme = useTheme();

  // Mode state: Default is 'monthly'
  const [filterMode, setFilterMode] = useState<FilterMode>('monthly');

  // Month state for navigation in monthly mode
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNum = selectedDate.getMonth() + 1;

  // 1. Today Active / Latest Punch Query
  const { data: record, isLoading: isTodayLoading, error: todayError, refetch: refetchToday } = useAttendanceToday();

  // 2. Pure Backend API Summary Query (No client-side math / filters)
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary
  } = useAttendanceSummary(filterMode, filterMode === 'monthly' ? selectedYear : undefined, filterMode === 'monthly' ? selectedMonthNum : undefined);

  const punchIn = usePunchIn();
  const punchOut = usePunchOut();

  useEffect(() => {
    void requestLocationPermission();
    if (record && !record.punchOutTime) {
      void startTracking(record.id);
    }
  }, [record]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchToday(), refetchSummary()]);
    setRefreshing(false);
  }, [refetchToday, refetchSummary]);

  const isPunchedIn = !!record && !record.punchOutTime;
  const isPunchedOut = !!record && !!record.punchOutTime;

  const handlePunch = useCallback(() => {
    if (!isPunchedIn) {
      punchIn.mutate(undefined, {
        onSuccess: () => void onRefresh(),
        onError: (err) => Alert.alert('Punch In Failed', err.message)
      });
    } else {
      Alert.alert('Punch Out', 'Are you sure you want to punch out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Punch Out', style: 'destructive',
          onPress: () =>
            punchOut.mutate(undefined, {
              onSuccess: () => void onRefresh(),
              onError: (e) => Alert.alert('Punch Out Failed', e.message)
            })
        }
      ]);
    }
  }, [isPunchedIn, punchIn, punchOut, onRefresh]);

  const isMutating = punchIn.isPending || punchOut.isPending;

  const statusColor = isPunchedIn
    ? theme.colors.semantic.success
    : isPunchedOut
    ? theme.colors.semantic.info
    : theme.colors.semantic.warning;

  const statusLabel = isPunchedIn
    ? '● Punched In'
    : isPunchedOut
    ? '✓ Session Complete (Ready for Next Shift)'
    : '○ Not Punched In';

  const changeMonth = (offset: number) => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + offset);
    setSelectedDate(next);
  };

  const monthYearLabel = selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.brand.primary]}
            tintColor={theme.colors.brand.primary}
          />
        }
      >
        {/* Title */}
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Attendance</Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, marginBottom: 20 }]}>
          Track sessions, manage shifts & view history
        </Text>

        {/* Hero Punch Action Card */}
        <Card variant="elevated" style={{ marginBottom: 20 }}>
          <Text style={[typography.headingSm, { color: statusColor, marginBottom: 16 }]}>{statusLabel}</Text>

          {isTodayLoading && <ActivityIndicator style={{ marginBottom: 16 }} color={theme.colors.brand.primary} />}
          {todayError && (
            <Text style={[typography.bodySm, { color: theme.colors.semantic.error, marginBottom: 12 }]}>
              {(todayError as Error).message}
            </Text>
          )}

          <View style={s.timeRow}>
            <View style={s.timeBlock}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                Punch In
              </Text>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
                {formatTime(record?.punchInTime)}
              </Text>
            </View>
            <Divider direction="vertical" spacing={8} style={{ height: 44 }} />
            <View style={s.timeBlock}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                Punch Out
              </Text>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
                {formatTime(record?.punchOutTime)}
              </Text>
            </View>
            <Divider direction="vertical" spacing={8} style={{ height: 44 }} />
            <View style={s.timeBlock}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                Hours
              </Text>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
                {formatHours(record?.workingHours)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handlePunch}
            disabled={isMutating || isTodayLoading}
            style={[
              s.btn,
              {
                backgroundColor: isPunchedIn
                  ? theme.colors.semantic.error
                  : theme.colors.brand.primary,
                borderRadius: theme.borderRadius.md,
                opacity: isMutating || isTodayLoading ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.8}
          >
            {isMutating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[typography.button, { color: '#FFFFFF' }]}>{isPunchedIn ? 'Punch Out' : 'Punch In'}</Text>
            }
          </TouchableOpacity>
        </Card>

        {/* Filter Controls Header */}
        <View style={s.filterHeader}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>Attendance Logs</Text>
          <View style={s.tabContainer}>
            <TouchableOpacity
              onPress={() => setFilterMode('monthly')}
              style={[s.tabItem, filterMode === 'monthly' && { backgroundColor: theme.colors.brand.primary }]}
            >
              <Text style={[s.tabText, filterMode === 'monthly' && { color: '#FFF', fontWeight: '600' }]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterMode('all')}
              style={[s.tabItem, filterMode === 'all' && { backgroundColor: theme.colors.brand.primary }]}
            >
              <Text style={[s.tabText, filterMode === 'all' && { color: '#FFF', fontWeight: '600' }]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterMode('today')}
              style={[s.tabItem, filterMode === 'today' && { backgroundColor: theme.colors.brand.primary }]}
            >
              <Text style={[s.tabText, filterMode === 'today' && { color: '#FFF', fontWeight: '600' }]}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Calendar Bar */}
        {filterMode === 'monthly' && (
          <View style={[s.monthBar, { backgroundColor: theme.colors.surface.card, borderRadius: theme.borderRadius.md }]}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn}>
              <Text style={{ fontSize: 18, color: theme.colors.brand.primary }}>◀</Text>
            </TouchableOpacity>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>📅 {summaryData?.monthName || monthYearLabel}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
              <Text style={{ fontSize: 18, color: theme.colors.brand.primary }}>▶</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Summary Bar from Backend API */}
        {summaryData && (
          <View style={[s.statsBar, { backgroundColor: theme.colors.surface.input, borderRadius: theme.borderRadius.md }]}>
            <View style={s.statItem}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                {filterMode === 'all' ? 'Months' : filterMode === 'monthly' ? 'Days Worked' : 'Sessions'}
              </Text>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {filterMode === 'all' ? summaryData.totalMonths : filterMode === 'monthly' ? summaryData.totalDaysWorked : summaryData.sessionsCount}
              </Text>
            </View>
            <Divider direction="vertical" spacing={8} style={{ height: 28 }} />
            <View style={s.statItem}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Total Hours</Text>
              <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>{formatHours(summaryData.totalHours)}</Text>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {isSummaryLoading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand.primary} size="large" />}

        {/* MODE 1: MONTHLY VIEW -> Daily Breakdown from Backend */}
        {!isSummaryLoading && filterMode === 'monthly' && (
          <>
            {(!summaryData?.days || summaryData.days.length === 0) ? (
              <EmptyState
                icon="📅"
                title="No Attendance for Selected Month"
                subtitle="Daily attendance totals for this month will appear here."
              />
            ) : (
              summaryData.days.map((day) => (
                <Card key={day.date} style={s.historyCard}>
                  <View style={s.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        📅 {formatDate(day.date)} ({day.dayOfWeek})
                      </Text>
                      <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                        Shifts/Sessions: {day.sessionsCount}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Daily Total</Text>
                      <Text style={[typography.headingMd, { color: theme.colors.brand.primary }]}>
                        {formatHours(day.totalHours)}
                      </Text>
                    </View>
                  </View>

                  {/* Individual Shift Sessions for this day */}
                  <Divider direction="horizontal" spacing={12} />
                  {day.records.map((r, idx) => (
                    <View key={r.id} style={{ marginTop: idx > 0 ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[typography.caption, { color: theme.colors.text.primary }]}>
                          ⏰ {formatTime(r.punchInTime)} → {formatTime(r.punchOutTime)}
                        </Text>
                        <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                          {formatHours(r.workingHours)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Card>
              ))
            )}
          </>
        )}

        {/* MODE 2: ALL VIEW -> Monthly Breakdown from Backend */}
        {!isSummaryLoading && filterMode === 'all' && (
          <>
            {(!summaryData?.months || summaryData.months.length === 0) ? (
              <EmptyState
                icon="📊"
                title="No Attendance History"
                subtitle="Monthly attendance summary totals will be listed here."
              />
            ) : (
              summaryData.months.map((mItem) => (
                <Card key={mItem.monthKey} style={s.historyCard}>
                  <View style={s.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        🗓️ {mItem.monthName}
                      </Text>
                      <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                        Days Worked: {mItem.daysWorked} | Total Sessions: {mItem.sessionsCount}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Monthly Total</Text>
                      <Text style={[typography.headingMd, { color: theme.colors.brand.primary }]}>
                        {formatHours(mItem.totalHours)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* MODE 3: TODAY VIEW -> Today Sessions from Backend */}
        {!isSummaryLoading && filterMode === 'today' && (
          <>
            {(!summaryData?.records || summaryData.records.length === 0) ? (
              <EmptyState
                icon="☀️"
                title="No Attendance Today"
                subtitle="Punch in to record your attendance for today."
              />
            ) : (
              summaryData.records.map((r) => (
                <Card key={r.id} style={s.historyCard}>
                  <View style={s.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        {formatDate(r.punchInTime)}
                      </Text>
                      <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                        ⏰ {formatTime(r.punchInTime)} → {formatTime(r.punchOutTime)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.headingMd, { color: theme.colors.brand.primary }]}>
                        {formatHours(r.workingHours)}
                      </Text>
                      <View style={[
                        s.badge,
                        { backgroundColor: r.punchOutTime ? '#E6F4EA' : '#FEF7E0' }
                      ]}>
                        <Text style={[
                          typography.caption,
                          { color: r.punchOutTime ? theme.colors.semantic.success : theme.colors.semantic.warning }
                        ]}>
                          {r.punchOutTime ? 'Completed' : 'Active'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* GPS Note */}
        <View style={[s.infoBox, { backgroundColor: theme.colors.surface.input, borderRadius: theme.borderRadius.md, marginTop: 16 }]}>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
            📍 GPS location is captured automatically and synced to the server every 2.5 minutes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timeBlock: { flex: 1, alignItems: 'center' },
  btn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8ECEF',
    borderRadius: 20,
    padding: 3,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  monthBtn: {
    padding: 6,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  historyCard: {
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  infoBox: { padding: 16 },
});
