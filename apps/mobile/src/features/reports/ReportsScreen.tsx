import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  ScreenHeader,
  StatCard,
  AppIcon,
  LoadingState,
  ErrorState,
  EmptyState,
  Button,
  Divider,
} from '../../shared/components';
import { api } from '../../shared/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportTab = 'attendance' | 'visits' | 'sales';

interface DatePreset {
  label: string;
  days: number;
}

const DATE_PRESETS: DatePreset[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (days > 0) {
    start.setDate(start.getDate() - days);
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── API hooks ────────────────────────────────────────────────────────────────

function useAttendanceReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['report', 'attendance', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/attendance', { params: { startDate, endDate } });
      return res.data.data;
    },
  });
}

function useVisitsReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['report', 'visits', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/visits', { params: { startDate, endDate } });
      return res.data.data;
    },
  });
}

function useSalesReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['report', 'sales', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/sales', { params: { startDate, endDate } });
      return res.data.data;
    },
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tabBtn,
        {
          backgroundColor: active ? theme.colors.brand.primary : theme.colors.surface.subtle,
          borderColor: active ? theme.colors.brand.primary : theme.colors.surface.border,
        },
      ]}
    >
      <Text style={[typography.bodySm, {
        color: active ? theme.colors.text.inverse : theme.colors.text.secondary,
        fontWeight: active ? '700' : '500',
      }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Attendance Report View ────────────────────────────────────────────────────

function AttendanceReportView({ startDate, endDate }: { startDate: string; endDate: string }) {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useAttendanceReport(startDate, endDate);

  if (isLoading) return <LoadingState message="Generating attendance report..." />;
  if (isError) return <ErrorState message="Failed to load report" onRetry={refetch} />;
  if (!data) return null;

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard label="Records" value={String(data.totalRecords)} icon="attendance" style={{ flex: 1, marginRight: 8 }} />
        <StatCard label="Total Hours" value={`${data.totalWorkingHours}h`} icon="history" style={{ flex: 1 }} />
      </View>

      {data.records.length === 0 ? (
        <EmptyState icon="attendance" title="No Records" subtitle="No attendance data for this period." />
      ) : (
        data.records.map((r: any) => (
          <Card key={r.id} style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="profile" color={theme.colors.brand.primary} size={16} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {r.employee?.name ?? 'Unknown'}
                </Text>
              </View>
              {r.workingHours != null && (
                <Text style={[typography.bodySm, { color: theme.colors.semantic.success, fontWeight: '700' }]}>
                  {r.workingHours.toFixed(1)}h
                </Text>
              )}
            </View>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
              {formatDate(r.punchInTime)} · In: {formatTime(r.punchInTime)}
              {r.punchOutTime ? ` · Out: ${formatTime(r.punchOutTime)}` : ' · Active'}
            </Text>
          </Card>
        ))
      )}
    </>
  );
}

// ── Visits Report View ────────────────────────────────────────────────────────

function VisitsReportView({ startDate, endDate }: { startDate: string; endDate: string }) {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useVisitsReport(startDate, endDate);

  if (isLoading) return <LoadingState message="Generating visits report..." />;
  if (isError) return <ErrorState message="Failed to load report" onRetry={refetch} />;
  if (!data) return null;

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard label="Total Visits" value={String(data.totalRecords)} icon="visits" style={{ flex: 1, marginRight: 8 }} />
        <StatCard label="Duration" value={`${data.totalDurationMinutes}m`} icon="history" style={{ flex: 1 }} />
      </View>

      {data.records.length === 0 ? (
        <EmptyState icon="visits" title="No Visits" subtitle="No visit records for this period." />
      ) : (
        data.records.map((r: any) => (
          <Card key={r.id} style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="visits" color={theme.colors.brand.primary} size={16} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {r.customer?.name ?? 'Unknown Customer'}
                </Text>
              </View>
              {r.durationMinutes != null && (
                <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                  {r.durationMinutes}m
                </Text>
              )}
            </View>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
              {r.employee?.name ?? ''} · {formatDate(r.checkInTime)} {formatTime(r.checkInTime)}
            </Text>
            {r.productsDiscussed && (
              <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 4 }]} numberOfLines={1}>
                {r.productsDiscussed}
              </Text>
            )}
          </Card>
        ))
      )}
    </>
  );
}

// ── Sales Report View ─────────────────────────────────────────────────────────

function SalesReportView({ startDate, endDate }: { startDate: string; endDate: string }) {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useSalesReport(startDate, endDate);

  if (isLoading) return <LoadingState message="Generating sales report..." />;
  if (isError) return <ErrorState message="Failed to load report" onRetry={refetch} />;
  if (!data) return null;

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard label="Transactions" value={String(data.totalRecords)} icon="sales" style={{ flex: 1, marginRight: 8 }} />
        <StatCard
          label="Revenue"
          value={`₹${Number(data.totalRevenue).toLocaleString('en-IN')}`}
          icon="sales"
          style={{ flex: 1 }}
        />
      </View>
      <View style={[styles.statsRow, { marginTop: 0 }]}>
        <StatCard label="Items Sold" value={String(data.totalItemsSold)} icon="products" style={{ flex: 1 }} />
      </View>

      {data.records.length === 0 ? (
        <EmptyState icon="sales" title="No Sales" subtitle="No sales transactions for this period." />
      ) : (
        data.records.map((r: any) => (
          <Card key={r.id} style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="sales" color={theme.colors.semantic.success} size={16} />
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {r.customer?.name ?? 'Unknown Customer'}
                </Text>
              </View>
              <Text style={[typography.headingSm, { color: theme.colors.semantic.success }]}>
                ₹{Number(r.totalAmount).toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
              {r.employee?.name ?? ''} · {formatDate(r.createdAt)} · {r.items.length} item{r.items.length !== 1 ? 's' : ''}
            </Text>
          </Card>
        ))
      )}
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

interface Props {
  navigation?: any;
}

export function ReportsScreen({ navigation }: Props = {}) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [activeDays, setActiveDays] = useState(7);

  const { startDate, endDate } = getDateRange(activeDays);

  return (
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader title="Reports" subtitle={`${startDate} — ${endDate}`} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Date Range Presets */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 10 }]}>
            Date Range
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                onPress={() => setActiveDays(preset.days)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: activeDays === preset.days ? theme.colors.brand.primary : theme.colors.surface.subtle,
                    borderColor: activeDays === preset.days ? theme.colors.brand.primary : theme.colors.surface.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[typography.bodySm, {
                  color: activeDays === preset.days ? theme.colors.text.inverse : theme.colors.text.secondary,
                  fontWeight: activeDays === preset.days ? '700' : '500',
                }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Report Type Tabs */}
        <View style={styles.tabRow}>
          <TabButton label="Attendance" active={activeTab === 'attendance'} onPress={() => setActiveTab('attendance')} />
          <TabButton label="Visits" active={activeTab === 'visits'} onPress={() => setActiveTab('visits')} />
          <TabButton label="Sales" active={activeTab === 'sales'} onPress={() => setActiveTab('sales')} />
        </View>

        <Divider spacing={12} />

        {/* Report Content */}
        {activeTab === 'attendance' && <AttendanceReportView startDate={startDate} endDate={endDate} />}
        {activeTab === 'visits' && <VisitsReportView startDate={startDate} endDate={endDate} />}
        {activeTab === 'sales' && <SalesReportView startDate={startDate} endDate={endDate} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
});
