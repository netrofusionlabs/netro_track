import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { useAuthStore } from '../../auth/stores/authStore';
import {
  Card,
  StatCard,
  Badge,
  StatusBadge,
  Section,
  AppIcon,
  ListItem,
  SyncIndicator,
} from '../../../shared/components';
import { useAttendanceToday } from '../../attendance/hooks/useAttendance';
import { getQueue } from '../../../shared/utils/offlineQueue';
import { useTodayVisits } from '../../visits/hooks/useVisits';
import { useTodaySales } from '../../sales/hooks/useSales';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import { startTracking, stopTracking } from '../../../shared/services/trackingService';
import { requestLocationPermission } from '../../../shared/utils/locationPermissions';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatPunchDate(iso: string | null | undefined): string {
  if (!iso) return '-- --- ----';
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return '-- --- ----';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

  React.useEffect(() => {
    if (isPunchedIn && todayRecord?.id) {
      void requestLocationPermission().then((granted) => {
        if (granted) {
          void startTracking(todayRecord.id);
        }
      });
    } else if (isPunchedOut) {
      void stopTracking();
    }
  }, [isPunchedIn, isPunchedOut, todayRecord?.id]);

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

        {/* Quick Actions Card */}
        <Card variant="elevated" style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>QUICK ACTIONS</Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.surface.divider }]} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            {(() => {
              const actions = [
                { label: 'Log Visit', icon: 'visits', screen: 'Visits', params: undefined, unreleased: true },
                { label: 'Record Sale', icon: 'sales', screen: 'Sales', params: undefined, unreleased: true },
                { label: 'Inspection', icon: 'inspect', screen: 'Inspections', params: undefined, unreleased: true },
                { label: 'Org Chart', icon: 'employees', screen: 'OrgChart', params: undefined, unreleased: false },
                { label: 'History', icon: 'history', screen: 'AttendanceHistory', params: undefined, unreleased: false },
              ];
              if ((user as any)?.isRegularizationEnabled) {
                actions.push({
                  label: 'Regularize',
                  icon: 'attendance',
                  screen: 'Attendance',
                  params: { screen: 'NewRegularization' } as any,
                  unreleased: false,
                });
              }
              return actions.map((act) => (
                <TouchableOpacity
                  key={act.label}
                  onPress={() => {
                    if (act.unreleased) {
                      Alert.alert(
                        'Feature Coming Soon',
                        `${act.label} is currently in active development and will be released in an upcoming update.`
                      );
                    } else {
                      navigation.navigate(act.screen, act.params);
                    }
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.quickActionItem,
                    {
                      backgroundColor: theme.colors.brand.primaryLight,
                      opacity: act.unreleased ? 0.7 : 1,
                    },
                  ]}
                >
                  <AppIcon name={act.icon} color={theme.colors.brand.primary} size={20} />
                  <Text numberOfLines={1} style={[typography.buttonSm, { color: theme.colors.brand.primary, marginTop: 6, fontWeight: '600', fontSize: 12 }]}>
                    {act.label}
                  </Text>
                  {act.unreleased && (
                    <Text style={{ fontSize: 9, color: theme.colors.text.secondary, marginTop: 1 }}>Soon</Text>
                  )}
                </TouchableOpacity>
              ));
            })()}
          </ScrollView>
        </Card>

        {/* 1. Attendance Hero Card */}
        {/* 1. Attendance Hero Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            {isPunchedIn ? (
              <View style={{ backgroundColor: '#E8F0FE', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="clock" color="#1A73E8" size={16} />
                <Text style={[typography.buttonSm, { color: '#1A73E8', fontWeight: '600', fontSize: 13 }]}>
                  Punched In
                </Text>
              </View>
            ) : isPunchedOut ? (
              <View style={{ backgroundColor: '#E6F4EA', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="success" color="#137333" size={16} />
                <Text style={[typography.buttonSm, { color: '#137333', fontWeight: '600', fontSize: 13 }]}>
                  Shift Complete
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#FFF0E1', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppIcon name="info" color="#B06000" size={16} />
                <Text style={[typography.buttonSm, { color: '#B06000', fontWeight: '600', fontSize: 13 }]}>
                  Not Punched In
                </Text>
              </View>
            )}
            <SyncIndicator state={(todayRecord?.id?.startsWith('local_') || getQueue('attendance').length > 0) ? 'pending' : 'synced'} />
          </View>

          {/* Side-by-side Punch In / Punch Out Cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 16 }}>
            {/* Punch In Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#F5FBF7',
                borderColor: '#E1EFE8',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#E6F4EA',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="login" color="#137333" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: '#5F6368', fontSize: 12 }]}>
                  Punch In
                </Text>
                <Text style={[typography.headingSm, { color: '#202124', fontWeight: '700', fontSize: 18, marginVertical: 2 }]} numberOfLines={1}>
                  {todayRecord?.punchInTime ? formatTime(todayRecord.punchInTime) : '--:--'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="calendar" color="#5F6368" size={12} />
                  <Text style={[typography.caption, { color: '#5F6368', fontSize: 11 }]} numberOfLines={1}>
                    {todayRecord?.punchInTime ? formatPunchDate(todayRecord.punchInTime) : formatPunchDate(new Date().toISOString())}
                  </Text>
                </View>
              </View>
            </View>

            {/* Punch Out Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#F4F7FC',
                borderColor: '#E2E8F5',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#E8F0FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="logout" color="#1A73E8" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: '#5F6368', fontSize: 12 }]}>
                  Punch Out
                </Text>
                <Text style={[typography.headingSm, { color: '#202124', fontWeight: '700', fontSize: 18, marginVertical: 2 }]} numberOfLines={1}>
                  {todayRecord?.punchOutTime ? formatTime(todayRecord.punchOutTime) : '--:--'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="calendar" color="#5F6368" size={12} />
                  <Text style={[typography.caption, { color: '#5F6368', fontSize: 11 }]} numberOfLines={1}>
                    {todayRecord?.punchOutTime ? formatPunchDate(todayRecord.punchOutTime) : formatPunchDate(new Date().toISOString())}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate('Attendance', {
                  screen: 'PunchForm',
                  params: { punchType: isPunchedIn ? 'out' : 'in' }
                });
              }}
              style={{
                flex: 1,
                height: 50,
                backgroundColor: isPunchedIn ? theme.colors.semantic.error : theme.colors.brand.primary,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="clock" color="#FFFFFF" size={18} />
                <View
                  style={{
                    width: 1,
                    height: 20,
                    backgroundColor: '#FFFFFF',
                    opacity: 0.3,
                    marginHorizontal: 12,
                  }}
                />
                <Text style={[typography.button, { color: '#FFFFFF', fontWeight: '700' }]}>
                  {isPunchedIn ? 'Punch Out' : isPunchedOut ? 'Punch In Again' : 'Punch In Now'}
                </Text>
              </View>
              <AppIcon name="arrowRight" color="#FFFFFF" size={16} />
            </TouchableOpacity>

            {isPunchedOut && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Attendance', { screen: 'AttendanceToday' })}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#A4C2F4',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View Session History"
              >
                <AppIcon name="history" color={theme.colors.brand.primary} size={20} />
              </TouchableOpacity>
            )}
          </View>
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
  quickActionsCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  quickActionsScroll: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  quickActionItem: {
    width: 90,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 4,
  },
});
