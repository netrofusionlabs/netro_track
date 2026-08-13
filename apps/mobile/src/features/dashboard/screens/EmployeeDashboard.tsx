import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { useAuthStore } from '../../auth/stores/authStore';
import {
  Card,
  StatCard,
  Badge,
  StatusBadge,
  Section,
  Button,
  AppIcon,
  ListItem,
  SyncIndicator,
} from '../../../shared/components';
import { useAttendanceToday } from '../../attendance/hooks/useAttendance';
import { useTodayVisits } from '../../visits/hooks/useVisits';
import { useTodaySales } from '../../sales/hooks/useSales';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function EmployeeDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: todayRecord, refetch: r1 } = useAttendanceToday();
  const { data: todayVisits = [], refetch: r2 } = useTodayVisits();
  const { data: todaySales = [], refetch: r3 } = useTodaySales();

  useRefreshOnFocus(React.useCallback(() => {
    void r1();
    void r2();
    void r3();
  }, [r1, r2, r3]));

  const isPunchedIn = !!todayRecord && !todayRecord.punchOutTime;
  const isPunchedOut = !!todayRecord && !!todayRecord.punchOutTime;

  const totalSalesAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount), 0
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Secondary Greeting Bar */}
        <View style={styles.greetingHeader}>
          <View>
            <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
              Good Morning, {user?.name?.split(' ')[0] ?? 'Agent'}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
              {formatDate(new Date())} · {(user as any)?.designation?.name || (user as any)?.designationName || (user as any)?.designation || 'Employee'}
            </Text>
          </View>
          <Badge
            label={(user as any)?.designation?.name || (user as any)?.designationName || (user as any)?.designation || 'Employee'}
            variant="info"
            size="sm"
          />
        </View>

        {/* 1. Attendance Hero Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <StatusBadge
              status={isPunchedIn ? 'active' : isPunchedOut ? 'completed' : 'offline'}
              label={isPunchedIn ? 'Punched In' : isPunchedOut ? 'Shift Complete' : 'Not Punched In'}
              size="md"
            />
            <SyncIndicator state={isPunchedIn ? 'synced' : 'pending'} />
          </View>

          <View style={styles.heroTimeRow}>
            <View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Punch In Time
              </Text>
              <Text style={[typography.statValue, { color: theme.colors.text.primary, marginTop: 2 }]}>
                {todayRecord?.punchInTime ? formatTime(todayRecord.punchInTime) : '--:--'}
              </Text>
            </View>
            <View style={[styles.vertDivider, { backgroundColor: theme.colors.surface.divider }]} />
            <View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Punch Out Time
              </Text>
              <Text style={[typography.statValue, { color: theme.colors.text.primary, marginTop: 2 }]}>
                {todayRecord?.punchOutTime ? formatTime(todayRecord.punchOutTime) : '--:--'}
              </Text>
            </View>
          </View>

          <Button
            label={isPunchedIn ? 'Punch Out' : isPunchedOut ? 'View Session History' : 'Punch In Now'}
            onPress={() => navigation.navigate('Attendance')}
            variant={isPunchedIn ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            icon={isPunchedIn ? 'logout' : 'attendance'}
          />
        </Card>

        {/* 2. Today's Activity Stats */}
        <Section title="Today's Performance">
          <View style={styles.statsRow}>
            <StatCard
              icon="visits"
              value={todayVisits.length}
              label="Visits Logged"
              valueColor={theme.colors.brand.primary}
            />
            <StatCard
              icon="sales"
              value={todaySales.length}
              label="Sales Closed"
              valueColor={theme.colors.semantic.success}
            />
            <StatCard
              icon="revenue"
              value={`₹${Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              label="Total Revenue"
              valueColor={theme.colors.brand.secondary}
            />
          </View>
        </Section>

        {/* 3. GPS Tracking Banner */}
        <Card style={styles.gpsBanner}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsIconBox, { backgroundColor: isPunchedIn ? theme.colors.semantic.successBg : theme.colors.surface.subtle }]}>
              <AppIcon
                name="locationPin"
                color={isPunchedIn ? theme.colors.semantic.success : theme.colors.text.tertiary}
                size={20}
              />
            </View>
            <View style={styles.gpsTextGroup}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {isPunchedIn ? 'Live GPS Tracking Active' : 'GPS Tracking Standby'}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                {isPunchedIn ? 'Location synced every 2.5 min during shift' : 'Punch in to start shift location tracking'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 4. Quick Actions */}
        <Section title="Quick Actions">
          <View style={styles.actionsGrid}>
            {[
              { label: 'Log Visit', icon: 'visits', screen: 'Visits' },
              { label: 'Record Sale', icon: 'sales', screen: 'Sales' },
              { label: 'Inspection', icon: 'inspect', screen: 'Inspections' },
              { label: 'Org Chart', icon: 'employees', screen: 'OrgChart' },
              { label: 'History', icon: 'history', screen: 'AttendanceHistory' },
            ].map((act) => (
              <Card
                key={act.label}
                onPress={() => navigation.navigate(act.screen)}
                style={styles.actionChip}
              >
                <View style={[styles.actionIconBox, { backgroundColor: theme.colors.brand.primaryLight }]}>
                  <AppIcon name={act.icon} color={theme.colors.brand.primary} size={20} />
                </View>
                <Text style={[typography.buttonSm, { color: theme.colors.text.primary, marginTop: 8, fontWeight: '600', textAlign: 'center' }]}>
                  {act.label}
                </Text>
              </Card>
            ))}
          </View>
        </Section>

        {/* 5. Recent Activity */}
        <Section title="Today's Activity Log" actionLabel="View All" onAction={() => navigation.navigate('Visits')}>
          {todayVisits.length === 0 && todaySales.length === 0 ? (
            <Card style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]}>
                No visits or sales logged yet today.
              </Text>
            </Card>
          ) : (
            <>
              {todayVisits.slice(0, 3).map((v) => (
                <ListItem
                  key={v.id}
                  icon="visits"
                  title={v.customer?.name ?? 'Customer Visit'}
                  subtitle={`${formatTime(v.checkInTime)} · ${v.notes ?? 'Visit checked in'}`}
                  trailing={<StatusBadge status={v.checkOutTime ? 'completed' : 'active'} />}
                  onPress={() => navigation.navigate('Visits')}
                />
              ))}
              {todaySales.slice(0, 2).map((sItem) => (
                <ListItem
                  key={sItem.id}
                  icon="sales"
                  title={`Sale: ${sItem.customer?.name ?? 'Client'}`}
                  subtitle={`₹${Number(sItem.totalAmount).toLocaleString('en-IN')} · ${sItem.items?.length ?? 1} item(s)`}
                  trailing={<StatusBadge status="completed" label="Closed" />}
                  onPress={() => navigation.navigate('Sales')}
                />
              ))}
            </>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroCard: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 4,
  },
  vertDivider: {
    width: 1,
    height: 36,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gpsBanner: {
    marginTop: 16,
    padding: 12,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTextGroup: {
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  actionChip: {
    width: '30%',
    minWidth: 96,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 0,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
