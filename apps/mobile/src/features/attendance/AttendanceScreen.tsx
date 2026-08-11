import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  EmptyState,
  ErrorState,
  AppIcon,
  StatusBadge,
  Button,
  IconButton,
  SegmentedControl,
  Section,
  SyncIndicator,
} from '../../shared/components';
import {
  useAttendanceToday,
  useAttendanceSummary,
  usePunchIn,
  usePunchOut,
} from './hooks/useAttendance';
import { requestLocationPermission } from '../../shared/utils/locationPermissions';
import { startTracking, isTrackingActive } from '../../shared/services/trackingService';

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? null : d;
}

function safeNum(val: number | string | null | undefined): number | null {
  if (val == null || val === '') return null;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? null : num;
}

function formatDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
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

  const [filterMode, setFilterMode] = useState<FilterMode>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNum = selectedDate.getMonth() + 1;

  const { data: record, isLoading: isTodayLoading, error: todayError, refetch: refetchToday } = useAttendanceToday();

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAttendanceSummary(
    filterMode,
    filterMode === 'monthly' ? selectedYear : undefined,
    filterMode === 'monthly' ? selectedMonthNum : undefined
  );

  const punchIn = usePunchIn();
  const punchOut = usePunchOut();

  useEffect(() => {
    void requestLocationPermission();
    if (record && !record.punchOutTime && record.id) {
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
        onError: (err) => Alert.alert('Punch In Failed', err.message),
      });
    } else {
      Alert.alert('Punch Out', 'Are you sure you want to punch out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Punch Out',
          style: 'destructive',
          onPress: () =>
            punchOut.mutate(undefined, {
              onSuccess: () => void onRefresh(),
              onError: (e) => Alert.alert('Punch Out Failed', e.message),
            }),
        },
      ]);
    }
  }, [isPunchedIn, punchIn, punchOut, onRefresh]);

  const isMutating = punchIn.isPending || punchOut.isPending;

  const changeMonth = (offset: number) => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + offset);
    setSelectedDate(next);
  };

  const monthYearLabel = selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const isGpsActive = isTrackingActive() || isPunchedIn;

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
        {/* Screen Title Header */}
        <View style={styles.headerArea}>
          <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Attendance</Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
            Track shifts, record working hours & view history
          </Text>
        </View>

        {/* Hero Current Session Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <StatusBadge
              status={isPunchedIn ? 'active' : isPunchedOut ? 'completed' : 'offline'}
              label={isPunchedIn ? 'Punched In' : isPunchedOut ? 'Shift Complete' : 'Not Punched In'}
              size="md"
            />
            <SyncIndicator state={isPunchedIn ? 'synced' : 'pending'} />
          </View>

          {isTodayLoading && <ActivityIndicator style={{ marginVertical: 10 }} color={theme.colors.brand.primary} />}
          {todayError && (
            <Text style={[typography.bodySm, { color: theme.colors.semantic.error, marginVertical: 6 }]}>
              {(todayError as Error).message}
            </Text>
          )}

          {/* 3-Column Info Layout */}
          <View style={styles.columnsRow}>
            <View style={styles.columnItem}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Punch In</Text>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 2 }]}>
                {formatTime(record?.punchInTime)}
              </Text>
            </View>
            <View style={[styles.colDivider, { backgroundColor: theme.colors.surface.divider }]} />
            <View style={styles.columnItem}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Punch Out</Text>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 2 }]}>
                {formatTime(record?.punchOutTime)}
              </Text>
            </View>
            <View style={[styles.colDivider, { backgroundColor: theme.colors.surface.divider }]} />
            <View style={styles.columnItem}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Hours</Text>
              <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginTop: 2 }]}>
                {formatHours(record?.workingHours)}
              </Text>
            </View>
          </View>

          {/* Punch Button */}
          <Button
            label={isPunchedIn ? 'Punch Out' : 'Punch In'}
            onPress={handlePunch}
            disabled={isMutating || isTodayLoading}
            loading={isMutating}
            variant={isPunchedIn ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            icon={isPunchedIn ? 'logout' : 'attendance'}
          />
        </Card>

        {/* Section Header & Segmented Filter Control */}
        <Section title="Attendance Logs">
          <SegmentedControl
            options={[
              { value: 'today', label: 'Today' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'all', label: 'All' },
            ]}
            value={filterMode}
            onChange={(val) => setFilterMode(val as FilterMode)}
            style={{ marginBottom: 12 }}
          />
        </Section>

        {/* Monthly Month Selector Bar */}
        {filterMode === 'monthly' && (
          <Card style={styles.monthBar}>
            <IconButton
              icon="chevronLeft"
              onPress={() => changeMonth(-1)}
              variant="ghost"
              size="sm"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="calendar" color={theme.colors.brand.primary} size={16} />
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {summaryData?.monthName || monthYearLabel}
              </Text>
            </View>
            <IconButton
              icon="chevronRight"
              onPress={() => changeMonth(1)}
              variant="ghost"
              size="sm"
            />
          </Card>
        )}

        {/* Summary Card */}
        {summaryData && (
          <Card variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryCol}>
              <Text style={[typography.statValue, { color: theme.colors.text.primary }]}>
                {filterMode === 'all'
                  ? summaryData.totalMonths ?? 0
                  : filterMode === 'monthly'
                  ? summaryData.totalDaysWorked ?? 0
                  : summaryData.sessionsCount ?? 0}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                {filterMode === 'all' ? 'Months' : filterMode === 'monthly' ? 'Days Worked' : 'Sessions'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.surface.divider }]} />
            <View style={styles.summaryCol}>
              <Text style={[typography.statValue, { color: theme.colors.brand.primary }]}>
                {formatHours(summaryData.totalHours)}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Total Hours</Text>
            </View>
          </Card>
        )}

        {/* Summary Error State */}
        {summaryError && !isSummaryLoading && (
          <ErrorState
            title="Could not load summary"
            message={(summaryError as Error).message}
            onRetry={() => void refetchSummary()}
          />
        )}

        {/* Loading Indicator */}
        {isSummaryLoading && (
          <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.brand.primary} size="large" />
        )}

        {/* MODE 1: MONTHLY VIEW -> Daily Breakdown */}
        {!isSummaryLoading && !summaryError && filterMode === 'monthly' && (
          <>
            {(!summaryData?.days || summaryData.days.length === 0) ? (
              <EmptyState
                icon="calendar"
                title="No Attendance for Selected Month"
                subtitle="Daily attendance totals for this month will appear here."
              />
            ) : (
              (summaryData.days || []).map((day, dIdx) => (
                <Card key={day.date || `day-${dIdx}`} style={styles.logCard}>
                  <View style={styles.logRowTop}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      {formatDate(day.date)} {day.dayOfWeek ? `(${day.dayOfWeek})` : ''}
                    </Text>
                    <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                      {formatHours(day.totalHours)}
                    </Text>
                  </View>

                  <View style={styles.logRowBottom}>
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                      Shifts: {day.sessionsCount ?? 0}
                    </Text>
                  </View>

                  {(day.records || []).map((r, rIdx) => (
                    <View key={r.id || `rec-${rIdx}`} style={[styles.shiftSubRow, { borderTopColor: theme.colors.surface.divider }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <AppIcon name="clock" color={theme.colors.text.tertiary} size={14} />
                        <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                          {formatTime(r.punchInTime)} → {formatTime(r.punchOutTime)}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                        {formatHours(r.workingHours)}
                      </Text>
                    </View>
                  ))}
                </Card>
              ))
            )}
          </>
        )}

        {/* MODE 2: ALL VIEW -> Monthly Breakdown */}
        {!isSummaryLoading && !summaryError && filterMode === 'all' && (
          <>
            {(!summaryData?.months || summaryData.months.length === 0) ? (
              <EmptyState
                icon="history"
                title="No Attendance History"
                subtitle="Monthly attendance summary totals will be listed here."
              />
            ) : (
              (summaryData.months || []).map((mItem, mIdx) => (
                <Card key={mItem.monthKey || `m-${mIdx}`} style={styles.logCard}>
                  <View style={styles.logRowTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="calendar" color={theme.colors.brand.primary} size={16} />
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        {mItem.monthName}
                      </Text>
                    </View>
                    <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                      {formatHours(mItem.totalHours)}
                    </Text>
                  </View>
                  <View style={styles.logRowBottom}>
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                      Days Worked: {mItem.daysWorked ?? 0} · Total Sessions: {mItem.sessionsCount ?? 0}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* MODE 3: TODAY VIEW -> Today Sessions */}
        {!isSummaryLoading && !summaryError && filterMode === 'today' && (
          <>
            {(!summaryData?.records || summaryData.records.length === 0) ? (
              <EmptyState
                icon="attendance"
                title="No Attendance Today"
                subtitle="Punch in to record your attendance for today."
              />
            ) : (
              (summaryData.records || []).map((r, rIdx) => (
                <Card key={r.id || `rec-${rIdx}`} style={styles.logCard}>
                  <View style={styles.logRowTop}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      {formatDate(r.punchInTime)}
                    </Text>
                    <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                      {formatHours(r.workingHours)}
                    </Text>
                  </View>
                  <View style={styles.logRowBottom}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <AppIcon name="clock" color={theme.colors.text.tertiary} size={14} />
                      <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                        {formatTime(r.punchInTime)} → {formatTime(r.punchOutTime)}
                      </Text>
                    </View>
                    <StatusBadge
                      status={r.punchOutTime ? 'completed' : 'active'}
                      label={r.punchOutTime ? 'Completed' : 'Active'}
                    />
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* GPS Status Card */}
        <Card style={styles.gpsCard}>
          <AppIcon name="visits" color={theme.colors.brand.primary} size={20} />
          <View style={styles.gpsTextGroup}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {isGpsActive ? 'GPS tracking active' : 'GPS tracking available'}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
              Location is captured automatically and synced to the server every 2.5 minutes during active shift hours.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerArea: {
    marginBottom: 16,
  },
  heroCard: {
    padding: 16,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  columnItem: {
    flex: 1,
    alignItems: 'center',
  },
  colDivider: {
    width: 1,
    height: 32,
  },
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  logCard: {
    padding: 14,
    marginBottom: 8,
  },
  logRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginTop: 8,
    gap: 12,
  },
  gpsTextGroup: {
    flex: 1,
  },
});
