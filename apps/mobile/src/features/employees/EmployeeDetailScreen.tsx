import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Avatar,
  Badge,
  Card,
  Section,
  StatCard,
  StatusBadge,
  LoadingState,
  EmptyState,
  AppIcon,
} from '../../shared/components';
import {
  useEmployeeAttendanceToday,
  useEmployeeVisits,
  useEmployeeSales,
  useEmployeeInspections,
} from './hooks/useEmployeeDetail';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';
import type { EmployeeRecord } from './types';

interface Props {
  route: any;
  navigation: any;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmployeeDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { employee } = route.params;

  const { data: attendance, isLoading: loadingAttendance, refetch: r1 } = useEmployeeAttendanceToday(employee.id);
  const { data: visits = [], isLoading: loadingVisits, refetch: r2 } = useEmployeeVisits(employee.id);
  const { data: sales = [], isLoading: loadingSales, refetch: r3 } = useEmployeeSales(employee.id);
  const { data: inspections = [], isLoading: loadingInspections, refetch: r4 } = useEmployeeInspections(employee.id);

  useRefreshOnFocus(React.useCallback(() => {
    void r1();
    void r2();
    void r3();
    void r4();
  }, [r1, r2, r3, r4]));

  const isPunched = !!attendance && !attendance.punchOutTime;
  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

  const metaLine = [
    employee.designation?.name,
    employee.department?.name,
    employee.branch?.name,
  ].filter(Boolean).join(' · ') || employee.employeeId;

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      {/* ── Back row ── */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backRow, { borderBottomColor: theme.colors.surface.border }]}
        activeOpacity={0.7}
      >
        <AppIcon name="chevronLeft" color={theme.colors.brand.primary} size={22} />
        <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>Agents</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={employee.name} size="lg" />
            <View style={styles.profileInfo}>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
                {employee.name}
              </Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                {metaLine}
              </Text>
              <View style={styles.profileBadges}>
                <Badge label={formatRole(employee.role)} variant="info" size="sm" />
                <StatusBadge
                  status={isPunched ? 'active' : 'offline'}
                  label={isPunched ? 'Working' : 'Offline'}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* ── Today's Attendance ── */}
        <Section
          title="Attendance Today"
          actionLabel="Full History"
          onAction={() => navigation.navigate('EmployeeActivityHistory', { employeeId: employee.id, employeeName: employee.name, initialDataTab: 'attendance' })}
        >
          {loadingAttendance ? (
            <LoadingState message="Loading attendance..." />
          ) : !attendance ? (
            <Card style={styles.absentCard}>
              <View style={styles.absentRow}>
                <AppIcon name="attendance" color={theme.colors.semantic.error} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.semantic.error, marginLeft: 8 }]}>
                  Not punched in today
                </Text>
              </View>
            </Card>
          ) : (
            <Card variant="elevated" style={styles.attendanceCard}>
              <View style={styles.attendanceRow}>
                <View style={styles.attendanceItem}>
                  <Text style={[typography.overline, { color: theme.colors.text.secondary }]}>Punch In</Text>
                  <Text style={[typography.headingMd, { color: theme.colors.semantic.success, marginTop: 4 }]}>
                    {formatTime(attendance.punchInTime)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.surface.border }]} />
                <View style={styles.attendanceItem}>
                  <Text style={[typography.overline, { color: theme.colors.text.secondary }]}>Punch Out</Text>
                  <Text style={[
                    typography.headingMd,
                    { color: attendance.punchOutTime ? theme.colors.text.primary : theme.colors.text.tertiary, marginTop: 4 }
                  ]}>
                    {attendance.punchOutTime ? formatTime(attendance.punchOutTime) : 'Active'}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.surface.border }]} />
                <View style={styles.attendanceItem}>
                  <Text style={[typography.overline, { color: theme.colors.text.secondary }]}>Hours</Text>
                  <Text style={[typography.headingMd, { color: theme.colors.brand.primary, marginTop: 4 }]}>
                    {attendance.workingHours != null ? `${Number(attendance.workingHours).toFixed(1)}h` : '—'}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </Section>

        {/* ── Activity Summary Stats ── */}
        <Section title="Activity Summary">
          <View style={styles.statsRow}>
            <StatCard icon="visits" value={visits.length} label="Total Visits" valueColor={theme.colors.brand.primary} />
            <StatCard icon="sales" value={sales.length} label="Total Sales" valueColor={theme.colors.semantic.success} />
            <StatCard icon="inspect" value={inspections.length} label="Inspections" valueColor={theme.colors.brand.secondary} />
          </View>
          {sales.length > 0 && (
            <Card style={styles.revenueCard}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Total Sales Volume</Text>
              <Text style={[typography.displaySm, { color: theme.colors.semantic.success, marginTop: 4 }]}>
                ₹{totalSalesAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </Card>
          )}
        </Section>

        {/* ── Recent Visits ── */}
        <Section
          title="Recent Visits"
          actionLabel={visits.length > 0 ? 'See All' : undefined}
          onAction={() => navigation.navigate('EmployeeActivityHistory', { employeeId: employee.id, employeeName: employee.name, initialDataTab: 'visits' })}
        >
          {loadingVisits ? (
            <LoadingState message="Loading visits..." />
          ) : visits.length === 0 ? (
            <EmptyState icon="visits" title="No Visits" subtitle="No visits recorded yet." />
          ) : (
            visits.slice(0, 5).map((v) => (
              <Card key={v.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <AppIcon name="visits" color={theme.colors.brand.primary} size={16} />
                  <View style={styles.activityInfo}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      {v.customer?.name ?? 'Unknown Customer'}
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      {formatDate(v.checkInTime)} · {formatTime(v.checkInTime)}
                    </Text>
                  </View>
                  <StatusBadge status={v.checkOutTime ? 'completed' : 'active'} label={v.checkOutTime ? 'Done' : 'Active'} />
                </View>
              </Card>
            ))
          )}
        </Section>

        {/* ── Recent Sales ── */}
        <Section
          title="Recent Sales"
          actionLabel={sales.length > 0 ? 'See All' : undefined}
          onAction={() => navigation.navigate('EmployeeActivityHistory', { employeeId: employee.id, employeeName: employee.name, initialDataTab: 'sales' })}
        >
          {loadingSales ? (
            <LoadingState message="Loading sales..." />
          ) : sales.length === 0 ? (
            <EmptyState icon="sales" title="No Sales" subtitle="No sales recorded yet." />
          ) : (
            sales.slice(0, 5).map((s) => (
              <Card key={s.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <AppIcon name="sales" color={theme.colors.semantic.success} size={16} />
                  <View style={styles.activityInfo}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      {s.customer?.name ?? 'Unknown Customer'}
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      {formatDate(s.createdAt)} · {s.items.length} item{s.items.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={[typography.headingSm, { color: theme.colors.semantic.success }]}>
                    ₹{Number(s.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </Section>

        {/* ── Recent Inspections ── */}
        <Section
          title="Recent Inspections"
          actionLabel={inspections.length > 0 ? 'See All' : undefined}
          onAction={() => navigation.navigate('EmployeeActivityHistory', { employeeId: employee.id, employeeName: employee.name, initialDataTab: 'inspections' })}
        >
          {loadingInspections ? (
            <LoadingState message="Loading inspections..." />
          ) : inspections.length === 0 ? (
            <EmptyState icon="inspect" title="No Inspections" subtitle="No inspections recorded yet." />
          ) : (
            inspections.slice(0, 5).map((i) => (
              <Card key={i.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <AppIcon name="inspect" color={theme.colors.brand.secondary} size={16} />
                  <View style={styles.activityInfo}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      {i.siteName}
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      {formatDate(i.createdAt)}{i.category ? ` · ${i.category}` : ''}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </Section>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  profileCard: { padding: 16, marginBottom: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1 },
  profileBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  absentCard: { padding: 16 },
  absentRow: { flexDirection: 'row', alignItems: 'center' },
  attendanceCard: { padding: 16 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center' },
  attendanceItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, marginHorizontal: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  revenueCard: { padding: 14, marginTop: 8 },
  activityCard: { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityInfo: { flex: 1 },
});
