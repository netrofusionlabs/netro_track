/**
 * ActivityHistoryScreen
 *
 * Unified activity history for both the logged-in employee (own view)
 * and manager drill-down into a team member's history.
 *
 * Period tabs:  Today | Monthly | All Time
 * Data tabs:    Attendance | Visits | Sales | Inspections
 *
 * "All Time" month cards are tappable → jumps to Monthly tab for that month/year.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  SegmentedControl,
  AppIcon,
  Badge,
  Button,
} from '../../shared/components';
import { useAuthStore } from '../auth/stores/authStore';
import { useAttendanceSummary } from './hooks/useAttendance';
import {
  useEmployeeAttendanceSummary,
  useEmployeeVisits,
  useEmployeeSales,
  useEmployeeInspections,
} from '../employees/hooks/useEmployeeDetail';
import { useVisits } from '../visits/hooks/useVisits';
import { useSales } from '../sales/hooks/useSales';
import { useInspections } from '../inspections/hooks/useInspections';
import type { DailySummaryItem, MonthlySummaryItem } from './hooks/useAttendance';
import type { VisitRecord } from '../visits/types';
import type { SaleRecord } from '../sales/types';
import type { InspectionRecord } from '../inspections/types';

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = 'today' | 'monthly' | 'all';
type DataTab = 'attendance' | 'visits' | 'sales' | 'inspections';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' },
];

const DATA_OPTIONS: { value: DataTab; label: string }[] = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'visits', label: 'Visits' },
  { value: 'sales', label: 'Sales' },
  { value: 'inspections', label: 'Inspections' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function isoToDateKey(iso: string): string {
  return iso.split('T')[0];
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function filterByDateRange<T extends { [key: string]: any }>(
  items: T[],
  dateField: keyof T,
  from: Date,
  to: Date
): T[] {
  return items.filter((item) => {
    const d = new Date(item[dateField] as string);
    return d >= from && d <= to;
  });
}

// ── Month navigator header (reused by attendance monthly + data monthly) ──────
function MonthNav({
  monthName,
  summary,
  isCurrentMonth,
  onPrev,
  onNext,
}: {
  monthName?: string;
  summary?: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.monthNav}>
      <TouchableOpacity onPress={onPrev} style={styles.navBtn} activeOpacity={0.7}>
        <AppIcon name="chevronLeft" color={theme.colors.brand.primary} size={20} />
      </TouchableOpacity>
      <View style={styles.monthInfo}>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
          {monthName ?? ''}
        </Text>
        {!!summary && (
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
            {summary}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onNext}
        style={styles.navBtn}
        disabled={isCurrentMonth}
        activeOpacity={0.7}
      >
        <AppIcon
          name="chevronRight"
          color={isCurrentMonth ? theme.colors.text.muted : theme.colors.brand.primary}
          size={20}
        />
      </TouchableOpacity>
    </View>
  );
}

// ── Attendance sub-views ───────────────────────────────────────────────────────
function AttendanceTodayView({
  data,
  userId,
  navigation,
}: {
  data: { records?: { id: string; punchInTime: string; punchOutTime: string | null; workingHours: number | null }[] };
  userId?: string;
  navigation?: { navigate: (name: string, params?: RouteNavParams) => void };
}) {
  const theme = useTheme();
  const records = data.records ?? [];

  if (records.length === 0) {
    return <EmptyState icon="attendance" title="No Attendance Today" subtitle="No punch-in recorded for today." />;
  }

  const dayDate = records[0].punchInTime.split('T')[0];

  return (
    <>
      {records.map((r) => {
        const complete = !!r.punchOutTime;
        const label = sessionRouteLabel(r.punchInTime, r.punchOutTime);
        return (
          <Card key={r.id} variant="elevated" style={styles.itemCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {formatDate(r.punchInTime)}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {r.workingHours != null ? formatHours(r.workingHours) : 'In Progress'}
                </Text>
              </View>
              <StatusBadge status={complete ? 'completed' : 'active'} label={complete ? 'Complete' : 'Active'} />
            </View>
            
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (!userId) return;
                navigation?.navigate('RoutePlayback', {
                  userId,
                  date: dayDate,
                  mode: 'session',
                  attendanceId: r.id,
                  startAt: r.punchInTime,
                  endAt: r.punchOutTime,
                  sessionLabel: label,
                });
              }}
              disabled={!userId}
              style={[styles.sessionRow, { borderTopColor: theme.colors.surface.border }]}
            >
              <View style={styles.sessionRowMain}>
                <AppIcon name="clock" color={theme.colors.text.secondary} size={14} />
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginLeft: 8 }]}>
                  {label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.caption, { color: theme.colors.brand.primary, marginRight: 4, fontWeight: '600' }]}>
                  Route
                </Text>
                <AppIcon name="chevronRight" color={theme.colors.brand.primary} size={14} />
              </View>
            </TouchableOpacity>
          </Card>
        );
      })}
      {records.length > 1 ? (
        <Card variant="elevated" style={styles.itemCard}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
            Full Day Route ({records.length} sessions)
          </Text>
          <Button
            variant="outline"
            label="View Full Day Route"
            onPress={() => {
              if (!userId) return;
              navigation?.navigate('RoutePlayback', { userId, date: dayDate, mode: 'day' });
            }}
            disabled={!userId}
            icon="teamMap"
          />
        </Card>
      ) : null}
    </>
  );
}

function AttendanceMonthlyView({
  data,
  month: _month,
  year: _year,
  isCurrentMonth,
  onPrev,
  onNext,
  userId,
  navigation,
}: {
  data: { days?: DailySummaryItem[]; monthName?: string; totalHours?: number; totalDaysWorked?: number };
  month: number;
  year: number;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  userId?: string;
  navigation?: { navigate: (name: string, params?: RouteNavParams) => void };
}) {
  const theme = useTheme();
  const days = data.days ?? [];
  const summary = data.totalDaysWorked != null
    ? `${data.totalDaysWorked} days · ${formatHours(data.totalHours ?? 0)}`
    : undefined;

  return (
    <>
      <MonthNav
        monthName={data.monthName}
        summary={summary}
        isCurrentMonth={isCurrentMonth}
        onPrev={onPrev}
        onNext={onNext}
      />
      {days.length === 0 ? (
        <EmptyState icon="attendance" title="No Records" subtitle="No attendance records this month." />
      ) : (
        days.map((day) => (
          <Card key={day.date} variant="elevated" style={styles.itemCard}>
            <View style={[styles.rowBetween, { marginBottom: 4 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {day.dayOfWeek}, {day.date}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {day.sessionsCount} session{day.sessionsCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <Badge label={formatHours(day.totalHours)} variant="info" size="sm" />
            </View>
            
            <View style={styles.sessionList}>
              {day.records.map((r) => {
                const label = sessionRouteLabel(r.punchInTime, r.punchOutTime);
                return (
                  <TouchableOpacity
                    key={r.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!userId) return;
                      navigation?.navigate('RoutePlayback', {
                        userId,
                        date: day.date,
                        mode: 'session',
                        attendanceId: r.id,
                        startAt: r.punchInTime,
                        endAt: r.punchOutTime,
                        sessionLabel: label,
                      });
                    }}
                    disabled={!userId}
                    style={[styles.sessionRow, { borderTopColor: theme.colors.surface.border }]}
                  >
                    <View style={styles.sessionRowMain}>
                      <AppIcon name="clock" color={theme.colors.text.secondary} size={14} />
                      <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginLeft: 8 }]}>
                        {label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, marginRight: 4, fontWeight: '600' }]}>
                        Route
                      </Text>
                      <AppIcon name="chevronRight" color={theme.colors.brand.primary} size={14} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {day.records.length > 1 && (
              <View style={{ marginTop: 12 }}>
                <Button
                  variant="outline"
                  label="View Full Day Route"
                  onPress={() => {
                    if (!userId) return;
                    navigation?.navigate('RoutePlayback', { userId, date: day.date, mode: 'day' });
                  }}
                  disabled={!userId}
                  icon="teamMap"
                />
              </View>
            )}
          </Card>
        ))
      )}
    </>
  );
}

function AttendanceAllTimeView({
  data,
  onSelectMonth,
}: {
  data: { months?: MonthlySummaryItem[]; totalHours?: number };
  onSelectMonth: (year: number, month: number) => void;
}) {
  const theme = useTheme();
  const months = data.months ?? [];

  if (months.length === 0) {
    return <EmptyState icon="attendance" title="No Records" subtitle="No attendance records found." />;
  }

  return (
    <>
      <Card style={{ ...styles.summaryCard, backgroundColor: theme.colors.surface.subtle }}>
        <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>All-Time Total</Text>
        <Text style={[typography.displaySm, { color: theme.colors.brand.primary, marginTop: 4 }]}>
          {formatHours(data.totalHours ?? 0)}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
          across {months.length} month{months.length !== 1 ? 's' : ''}
        </Text>
      </Card>
      {months.map((m) => {
        const [y, mo] = m.monthKey.split('-').map(Number);
        return (
          <TouchableOpacity
            key={m.monthKey}
            onPress={() => onSelectMonth(y, mo)}
            activeOpacity={0.75}
          >
            <Card style={styles.itemCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>{m.monthName}</Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    {m.daysWorked} days · {m.sessionsCount} sessions
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge label={formatHours(m.totalHours)} variant="info" size="sm" />
                  <AppIcon name="chevronRight" color={theme.colors.text.muted} size={14} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

// ── Route button → GPS Route Playback ─────────────────────────────────────────
type RouteNavParams = {
  userId: string;
  date: string;
  mode?: 'session' | 'day';
  attendanceId?: string;
  startAt?: string;
  endAt?: string | null;
  sessionLabel?: string;
};



function sessionRouteLabel(punchInTime: string, punchOutTime: string | null): string {
  return `${formatTime(punchInTime)} → ${formatTime(punchOutTime)}`;
}

// ── Visit cards ───────────────────────────────────────────────────────────────
function VisitCards({ items }: { items: VisitRecord[] }) {
  const theme = useTheme();
  if (items.length === 0) return <EmptyState icon="visits" title="No Visits" subtitle="No visits recorded for this period." />;
  return (
    <>
      {items.map((v) => (
        <Card key={v.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="visits" color={theme.colors.brand.primary} size={14} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {v.customer?.name ?? 'Unknown Customer'}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 3 }]}>
                {formatDateShort(v.checkInTime)} · {formatTime(v.checkInTime)} → {formatTime(v.checkOutTime)}
              </Text>
              {v.productsDiscussed && (
                <Text style={[typography.caption, { color: theme.colors.text.muted, marginTop: 2 }]} numberOfLines={1}>
                  {v.productsDiscussed}
                </Text>
              )}
            </View>
            <StatusBadge status={v.checkOutTime ? 'completed' : 'active'} label={v.checkOutTime ? 'Done' : 'Active'} />
          </View>
        </Card>
      ))}
    </>
  );
}

// ── Sale cards ────────────────────────────────────────────────────────────────
function SaleCards({ items }: { items: SaleRecord[] }) {
  const theme = useTheme();
  if (items.length === 0) return <EmptyState icon="sales" title="No Sales" subtitle="No sales recorded for this period." />;
  return (
    <>
      {items.map((s) => (
        <Card key={s.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="sales" color={theme.colors.semantic.success} size={14} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {s.customer?.name ?? 'Unknown Customer'}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 3 }]}>
                {formatDateShort(s.createdAt)} · {s.items.length} item{s.items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={[typography.headingSm, { color: theme.colors.semantic.success }]}>
              ₹{Number(s.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </Card>
      ))}
    </>
  );
}

// ── Inspection cards ──────────────────────────────────────────────────────────
function InspectionCards({ items }: { items: InspectionRecord[] }) {
  const theme = useTheme();
  if (items.length === 0) return <EmptyState icon="inspect" title="No Inspections" subtitle="No inspections recorded for this period." />;
  return (
    <>
      {items.map((i) => (
        <Card key={i.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="inspect" color={theme.colors.brand.secondary} size={14} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {i.siteName}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 3 }]}>
                {formatDateShort(i.createdAt)}{i.category ? ` · ${i.category}` : ''}
              </Text>
              {i.observation && (
                <Text style={[typography.caption, { color: theme.colors.text.muted, marginTop: 2 }]} numberOfLines={2}>
                  {i.observation}
                </Text>
              )}
            </View>
            {i.imageUrls?.length > 0 && (
              <Badge label={`${i.imageUrls.length} 📷`} variant="default" size="sm" />
            )}
          </View>
        </Card>
      ))}
    </>
  );
}

// ── Monthly data view (visits/sales/inspections) ──────────────────────────────
function MonthlyDataView<T extends { [key: string]: any }>({
  items,
  dateField,
  month,
  year,
  isCurrentMonth,
  onPrev,
  onNext,
  renderCards,
  monthName,
}: {
  items: T[];
  dateField: keyof T;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  renderCards: (filtered: T[]) => React.ReactNode;
  monthName: string;
}) {
  const filtered = useMemo(
    () => filterByDateRange(items, dateField, startOfMonth(year, month), endOfMonth(year, month)),
    [items, dateField, year, month]
  );
  return (
    <>
      <MonthNav
        monthName={monthName}
        summary={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        isCurrentMonth={isCurrentMonth}
        onPrev={onPrev}
        onNext={onNext}
      />
      {renderCards(filtered)}
    </>
  );
}

// ── All-time data view (visits/sales/inspections grouped by month) ─────────────
function AllTimeDataView<T extends { [key: string]: any }>({
  items,
  dateField,
  onSelectMonth,
  renderCards,
  icon,
}: {
  items: T[];
  dateField: keyof T;
  onSelectMonth: (year: number, month: number) => void;
  renderCards: (filtered: T[]) => React.ReactNode;
  icon: string;
}) {
  const theme = useTheme();

  const grouped = useMemo(() => {
    const map = new Map<string, { year: number; month: number; monthName: string; items: T[] }>();
    for (const item of items) {
      const d = new Date(item[dateField] as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          monthName: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) =>
      `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`)
    );
  }, [items, dateField]);

  if (grouped.length === 0) return <EmptyState icon={icon} title="No Records" subtitle="No records found." />;

  return (
    <>
      {grouped.map((g) => (
        <TouchableOpacity key={`${g.year}-${g.month}`} onPress={() => onSelectMonth(g.year, g.month)} activeOpacity={0.75}>
          <Card style={styles.itemCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>{g.monthName}</Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {g.items.length} record{g.items.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Badge label={String(g.items.length)} variant="info" size="sm" />
                <AppIcon name="chevronRight" color={theme.colors.text.muted} size={14} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
interface Props {
  route?: {
    params?: {
      employeeId?: string;
      employeeName?: string;
      initialDataTab?: DataTab;
    };
  };
  navigation?: any;
}

export function AttendanceHistoryScreen({ route, navigation }: Props = {}) {
  const theme = useTheme();
  const authUserId = useAuthStore((s) => s.user?.id);
  const employeeId = route?.params?.employeeId;
  const employeeName = route?.params?.employeeName;
  const routeUserId = employeeId ?? authUserId;

  const [period, setPeriod] = useState<Period>('monthly');
  const [dataTab, setDataTab] = useState<DataTab>(route?.params?.initialDataTab ?? 'attendance');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const handlePrevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const handleSelectMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setPeriod('monthly');
  };

  // Month name for non-attendance tabs
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Attendance summary (API handles date range server-side)
  const selfAttQuery = useAttendanceSummary(period, year, month);
  const empAttQuery = useEmployeeAttendanceSummary(employeeId ?? '', period, year, month);
  const { data: attData, isLoading: attLoading, error: attError, refetch: attRefetch } =
    employeeId ? empAttQuery : selfAttQuery;

  // Visits / Sales / Inspections — fetch all, filter client-side by period
  const selfVisits = useVisits();
  const empVisits = useEmployeeVisits(employeeId ?? '');
  const { data: allVisits = [], isLoading: visitsLoading } = employeeId ? empVisits : selfVisits;

  const selfSales = useSales();
  const empSales = useEmployeeSales(employeeId ?? '');
  const { data: allSales = [], isLoading: salesLoading } = employeeId ? empSales : selfSales;

  const selfInspections = useInspections();
  const empInspections = useEmployeeInspections(employeeId ?? '');
  const { data: allInspections = [], isLoading: inspLoading } = employeeId ? empInspections : selfInspections;

  // Filter visits/sales/inspections for Today or Monthly period
  const todayVisits = useMemo(() => filterByDateRange(allVisits, 'checkInTime', startOfToday(), endOfToday()), [allVisits]);
  const todaySales = useMemo(() => filterByDateRange(allSales, 'createdAt', startOfToday(), endOfToday()), [allSales]);
  const todayInspections = useMemo(() => filterByDateRange(allInspections, 'createdAt', startOfToday(), endOfToday()), [allInspections]);

  useFocusEffect(
    useCallback(() => {
      void attRefetch();
      void empVisits.refetch();
      void selfVisits.refetch();
      void empSales.refetch();
      void selfSales.refetch();
      void empInspections.refetch();
      void selfInspections.refetch();
    }, [
      attRefetch,
      empVisits.refetch,
      selfVisits.refetch,
      empSales.refetch,
      selfSales.refetch,
      empInspections.refetch,
      selfInspections.refetch,
    ])
  );

  const title = employeeId ? `${employeeName ?? 'Employee'}'s Activity` : 'Activity History';

  const isLoading = dataTab === 'attendance' ? attLoading
    : dataTab === 'visits' ? visitsLoading
    : dataTab === 'sales' ? salesLoading
    : inspLoading;

  return (
    <SafeAreaView edges={[]} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* Back row */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.surface.border }]}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <AppIcon name="chevronLeft" color={theme.colors.brand.primary} size={22} />
          </TouchableOpacity>
        )}
        <Text style={[typography.headingLg, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Period selector */}
        <SegmentedControl
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          style={styles.segmented}
        />

        {/* Data type selector */}
        <SegmentedControl
          options={DATA_OPTIONS}
          value={dataTab}
          onChange={setDataTab}
          style={styles.segmented}
        />

        {isLoading && <LoadingState message="Loading..." />}

        {/* ── ATTENDANCE ── */}
        {!isLoading && dataTab === 'attendance' && (
          <>
            {attError && (
              <ErrorState title="Unable to load" message={(attError as Error).message} onRetry={() => void attRefetch()} />
            )}
            {!attError && attData && period === 'today' && (
              <AttendanceTodayView data={attData} userId={routeUserId} navigation={navigation} />
            )}
            {!attError && attData && period === 'monthly' && (
              <AttendanceMonthlyView
                data={attData}
                month={month}
                year={year}
                isCurrentMonth={isCurrentMonth}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                userId={routeUserId}
                navigation={navigation}
              />
            )}
            {!attError && attData && period === 'all' && (
              <AttendanceAllTimeView data={attData} onSelectMonth={handleSelectMonth} />
            )}
          </>
        )}

        {/* ── VISITS ── */}
        {!isLoading && dataTab === 'visits' && (
          <>
            {period === 'today' && <VisitCards items={todayVisits} />}
            {period === 'monthly' && (
              <MonthlyDataView
                items={allVisits}
                dateField="checkInTime"
                month={month}
                year={year}
                isCurrentMonth={isCurrentMonth}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                monthName={monthName}
                renderCards={(f) => <VisitCards items={f} />}
              />
            )}
            {period === 'all' && (
              <AllTimeDataView
                items={allVisits}
                dateField="checkInTime"
                icon="visits"
                onSelectMonth={handleSelectMonth}
                renderCards={(f) => <VisitCards items={f} />}
              />
            )}
          </>
        )}

        {/* ── SALES ── */}
        {!isLoading && dataTab === 'sales' && (
          <>
            {period === 'today' && <SaleCards items={todaySales} />}
            {period === 'monthly' && (
              <MonthlyDataView
                items={allSales}
                dateField="createdAt"
                month={month}
                year={year}
                isCurrentMonth={isCurrentMonth}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                monthName={monthName}
                renderCards={(f) => <SaleCards items={f} />}
              />
            )}
            {period === 'all' && (
              <AllTimeDataView
                items={allSales}
                dateField="createdAt"
                icon="sales"
                onSelectMonth={handleSelectMonth}
                renderCards={(f) => <SaleCards items={f} />}
              />
            )}
          </>
        )}

        {/* ── INSPECTIONS ── */}
        {!isLoading && dataTab === 'inspections' && (
          <>
            {period === 'today' && <InspectionCards items={todayInspections} />}
            {period === 'monthly' && (
              <MonthlyDataView
                items={allInspections}
                dateField="createdAt"
                month={month}
                year={year}
                isCurrentMonth={isCurrentMonth}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                monthName={monthName}
                renderCards={(f) => <InspectionCards items={f} />}
              />
            )}
            {period === 'all' && (
              <AllTimeDataView
                items={allInspections}
                dateField="createdAt"
                icon="inspect"
                onSelectMonth={handleSelectMonth}
                renderCards={(f) => <InspectionCards items={f} />}
              />
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  segmented: { marginBottom: 10, alignSelf: 'stretch', width: '100%' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  navBtn: { padding: 6 },
  monthInfo: { alignItems: 'center', flex: 1 },
  itemCard: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionList: {
    marginTop: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
  },
});
