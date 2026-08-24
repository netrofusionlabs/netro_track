import { lightTheme as theme } from "../../../shared/theme/tokens";

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
  Button,
  AppIcon,
  ProgressBar,
  SyncIndicator,
} from '../../../shared/components';
import { useTeamSummary } from '../hooks/useDashboard';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import { useRegularizations, useAttendanceToday } from '../../attendance/hooks/useAttendance';
import { getQueue } from '../../../shared/utils/offlineQueue';
import { startTracking, stopTracking } from '../../../shared/services/trackingService';
import { requestLocationPermission } from '../../../shared/utils/locationPermissions';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPunchDate(iso: string | null | undefined): string {
  if (!iso) return '-- --- ----';
  const safeStr = typeof iso === 'string' ? iso.replace(' ', 'T') : iso;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return '-- --- ----';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ManagerDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: teamSummary, refetch } = useTeamSummary();
  const { data: pendingRequests = [], refetch: refetchPending } = useRegularizations('PENDING');
  const { data: todayRecord, refetch: refetchAttendance } = useAttendanceToday();

  useRefreshOnFocus(React.useCallback(() => {
    void refetch();
    void refetchPending();
    void refetchAttendance();
  }, [refetch, refetchPending, refetchAttendance]));

  const isPunchedIn = !!todayRecord && !todayRecord.punchOutTime;
  const isPunchedOut = !!todayRecord && !!todayRecord.punchOutTime;

  const [isTracking, setIsTracking] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (isPunchedIn && todayRecord?.id) {
      void requestLocationPermission().then((granted) => {
        if (granted && user?.isGpsTracked !== false) {
          void startTracking(todayRecord.id);
          if (mounted) setIsTracking(true);
        } else {
          if (mounted) setIsTracking(false);
        }
      });
    } else if (isPunchedOut) {
      void stopTracking();
      if (mounted) setIsTracking(false);
    }
    return () => { mounted = false; };
  }, [isPunchedIn, isPunchedOut, todayRecord?.id, user?.isGpsTracked]);

  const visitsCount = teamSummary?.visitsToday ?? 0;
  const salesCount = teamSummary?.salesToday ?? 0;
  const inspectionsCount = 0; // not yet in team summary — shows 0 gracefully
  const totalSalesAmount = teamSummary?.revenueToday ?? 0;
  const presentCount = teamSummary?.presentToday ?? 0;
  const teamSize = teamSummary?.teamSize ?? 0;
  const absentCount = Math.max(0, teamSize - presentCount);
  const targetProgress = teamSize > 0 ? Math.min(1, presentCount / teamSize) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
              Supervisor Overview
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
              Hello, {user?.name?.split(' ')[0] ?? 'Manager'} · Team Operations
            </Text>
          </View>
          <Badge label="MANAGER" variant="info" size="sm" />
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
            {[
              { label: 'Agents', icon: 'employees', screen: 'Employees', params: undefined, unreleased: false },
              { label: 'Org Chart', icon: 'employees', screen: 'OrgChart', params: undefined, unreleased: false },
              { label: 'Requests', icon: 'attendance', screen: 'Employees', params: { screen: 'ManagerRegularizations' }, badgeCount: pendingRequests.length, unreleased: false },
              { label: 'Visits', icon: 'visits', screen: 'Visits', params: undefined, unreleased: true },
              { label: 'Sales', icon: 'sales', screen: 'Sales', params: undefined, unreleased: true },
              { label: 'Inspections', icon: 'inspect', screen: 'Inspections', params: undefined, unreleased: true },
            ].map((act) => (
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
                <View style={styles.quickActionIconBox}>
                  <AppIcon name={act.icon} color={theme.colors.brand.primary} size={20} />
                  {act.badgeCount != null && act.badgeCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{act.badgeCount}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={[typography.buttonSm, { color: theme.colors.brand.primary, marginTop: 6, fontWeight: '600', fontSize: 12 }]}>
                  {act.label}
                </Text>
                {act.unreleased && (
                  <Text style={{ fontSize: 9, color: theme.colors.text.secondary, marginTop: 1 }}>Soon</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* 1. Personal Attendance Hero Card */}
        <Section title="My Attendance">
          <Card variant="elevated" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              {isPunchedIn ? (
                <View style={{ backgroundColor: theme.colors.brand.primaryLight, borderRadius: theme.borderRadius.xl, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="clock" color={theme.colors.brand.primary} size={16} />
                  <Text style={[typography.buttonSm, { color: theme.colors.brand.primary, fontWeight: '600', fontSize: 13 }]}>
                    Punched In
                  </Text>
                </View>
              ) : isPunchedOut ? (
                <View style={{ backgroundColor: theme.colors.semantic.successBg, borderRadius: theme.borderRadius.xl, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="success" color={theme.colors.semantic.success} size={16} />
                  <Text style={[typography.buttonSm, { color: theme.colors.semantic.success, fontWeight: '600', fontSize: 13 }]}>
                    Shift Complete
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: theme.colors.semantic.warningBg, borderRadius: theme.borderRadius.xl, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="info" color={theme.colors.semantic.warning} size={16} />
                  <Text style={[typography.buttonSm, { color: theme.colors.semantic.warning, fontWeight: '600', fontSize: 13 }]}>
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
                  backgroundColor: theme.colors.surface.subtle,
                  borderColor: theme.colors.surface.border,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.semantic.successBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="login" color={theme.colors.semantic.success} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                    Punch In
                  </Text>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary, fontSize: 18, marginVertical: 2 }]} numberOfLines={1}>
                    {todayRecord?.punchInTime ? formatTime(todayRecord.punchInTime) : '--:--'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppIcon name="calendar" color={theme.colors.text.tertiary} size={12} />
                    <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11 }]} numberOfLines={1}>
                      {todayRecord?.punchInTime ? formatPunchDate(todayRecord.punchInTime) : formatPunchDate(new Date().toISOString())}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Punch Out Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surface.subtle,
                  borderColor: theme.colors.surface.border,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="logout" color={theme.colors.brand.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                    Punch Out
                  </Text>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary, fontSize: 18, marginVertical: 2 }]} numberOfLines={1}>
                    {todayRecord?.punchOutTime ? formatTime(todayRecord.punchOutTime) : '--:--'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppIcon name="calendar" color={theme.colors.text.tertiary} size={12} />
                    <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11 }]} numberOfLines={1}>
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
                  height: theme.sizes.buttonHeight.md,
                  backgroundColor: isPunchedIn ? theme.colors.semantic.error : theme.colors.brand.primary,
                  borderRadius: theme.borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="clock" color={theme.colors.text.inverse} size={18} />
                  <View
                    style={{
                      width: 1,
                      height: 20,
                      backgroundColor: theme.colors.text.inverse,
                      opacity: 0.3,
                      marginHorizontal: 12,
                    }}
                  />
                  <Text style={[typography.button, { color: theme.colors.text.inverse }]}>
                    {isPunchedIn ? 'Punch Out' : isPunchedOut ? 'Punch In Again' : 'Punch In Now'}
                  </Text>
                </View>
                <AppIcon name="arrowRight" color={theme.colors.text.inverse} size={16} />
              </TouchableOpacity>

              {isPunchedOut && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Attendance', { screen: 'AttendanceToday' })}
                  style={{
                    width: theme.sizes.buttonHeight.md,
                    height: theme.sizes.buttonHeight.md,
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 1.5,
                    borderColor: theme.colors.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.surface.card,
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
        </Section>

        {/* GPS Tracking Banner */}
        <Card style={styles.gpsBanner}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsIconBox, { backgroundColor: isTracking ? theme.colors.semantic.successBg : theme.colors.surface.subtle }]}>
              <AppIcon
                name="locationPin"
                color={isTracking ? theme.colors.semantic.success : theme.colors.text.tertiary}
                size={20}
              />
            </View>
            <View style={styles.gpsTextGroup}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {isTracking ? 'Live GPS Tracking Active' : (isPunchedIn ? 'GPS Tracking Disabled / Denied' : 'GPS Tracking Standby')}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                {isTracking ? 'Location synced every 2.5 min during shift' : (isPunchedIn ? 'Check device location permissions' : 'Punch in to start shift location tracking')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Live Map CTA Card */}
        <Card variant="elevated" style={styles.mapCard}>
          <View style={styles.mapRow}>
            <View style={[styles.mapIconBox, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="teamMap" color={theme.colors.brand.primary} size={22} />
            </View>
            <View style={styles.mapTextGroup}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Field Workforce Live Map
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                Track live location and route history of all agents
              </Text>
            </View>
          </View>
          <Button
            label="Open Live Map"
            onPress={() => navigation.navigate('TeamMap')}
            variant="primary"
            size="md"
            icon="teamMap"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Attendance Overview */}
        <Section title="Team Attendance Today">
          <View style={styles.statsRow}>
            <StatCard
              icon="attendance"
              value={presentCount}
              label="Present"
              valueColor={theme.colors.semantic.success}
            />
            <StatCard
              icon="employees"
              value={absentCount}
              label="Absent"
              valueColor={theme.colors.semantic.error}
            />
            <StatCard
              icon="employees"
              value={teamSize}
              label="Team Size"
              valueColor={theme.colors.brand.primary}
            />
          </View>
        </Section>

        {/* Team Performance Stats */}
        <Section title="Team Performance Today">
          <View style={styles.statsRow}>
            <StatCard
              icon="visits"
              value={visitsCount}
              label="Team Visits"
              valueColor={theme.colors.brand.primary}
            />
            <StatCard
              icon="sales"
              value={salesCount}
              label="Team Sales"
              valueColor={theme.colors.semantic.success}
            />
            <StatCard
              icon="inspect"
              value={inspectionsCount}
              label="Inspections"
              valueColor={theme.colors.brand.secondary}
            />
          </View>
        </Section>

        {/* Revenue Overview Card */}
        <Section title="Revenue Today">
          <Card variant="elevated" style={styles.revenueCard}>
            <View style={styles.revenueTop}>
              <View>
                <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                  Total Team Sales Volume
                </Text>
                <Text style={[typography.displayLg, { color: theme.colors.semantic.success, marginTop: 2 }]}>
                  ₹{Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <StatusBadge status={presentCount > 0 ? 'completed' : 'offline'} label={presentCount > 0 ? 'Team Active' : 'No Activity'} />
            </View>
            <ProgressBar progress={targetProgress} color={theme.colors.semantic.success} style={{ marginTop: 12 }} />
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 6 }]}>
              {presentCount} of {teamSize} team members present today
            </Text>
          </Card>
        </Section>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  topHeader: {
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
  gpsBanner: {
    marginTop: 16,
    marginBottom: 8,
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
  mapCard: {
    padding: 16,
    marginBottom: 8,
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTextGroup: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  revenueCard: {
    padding: 16,
  },
  revenueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.semantic.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionsCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  quickActionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    marginBottom: theme.spacing.md,
  },
  quickActionsScroll: {
    flexDirection: 'row',
    paddingRight: theme.spacing.lg,
  },
  quickActionItem: {
    width: 90,
    height: 72,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    paddingHorizontal: 4,
  },
  quickActionIconBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
