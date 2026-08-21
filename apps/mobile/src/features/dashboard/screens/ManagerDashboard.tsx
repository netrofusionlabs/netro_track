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
} from '../../../shared/components';
import { useTeamSummary } from '../hooks/useDashboard';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import { useRegularizations } from '../../attendance/hooks/useAttendance';

export function ManagerDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: teamSummary, refetch } = useTeamSummary();
  const { data: pendingRequests = [], refetch: refetchPending } = useRegularizations('PENDING');

  useRefreshOnFocus(React.useCallback(() => {
    void refetch();
    void refetchPending();
  }, [refetch, refetchPending]));

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
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
  quickActionIconBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
