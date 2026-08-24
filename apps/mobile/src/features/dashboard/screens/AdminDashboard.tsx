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
  Avatar,
  Section,
  AppIcon,
  Button,
} from '../../../shared/components';
import { useCustomers } from '../../customers/hooks/useCustomers';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useCompanyDetail } from '../../companies/hooks/useCompanies';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import { useRegularizations } from '../../attendance/hooks/useAttendance';
import { useDashboardSummary } from '../hooks/useDashboard';

export function AdminDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: company } = useCompanyDetail(user?.companyId);
  const { data: customers = [], refetch: r1 } = useCustomers();
  const { data: employees = [], refetch: r2 } = useEmployees();
  const { data: pendingRequests = [], refetch: r3 } = useRegularizations('PENDING');
  const { data: summary, refetch: r4 } = useDashboardSummary();

  useRefreshOnFocus(React.useCallback(() => {
    void r1();
    void r2();
    void r3();
    void r4();
  }, [r1, r2, r3, r4]));

  const portalHeader = React.useMemo(() => {
    switch (user?.role) {
      case 'HR':
        return {
          title: 'HR Executive Portal',
          subtitle: 'Workforce & Attendance Governance',
          badge: 'HR EXECUTIVE',
          variant: 'info' as const,
        };
      case 'COMPANY_ADMIN':
        return {
          title: 'Company Admin Portal',
          subtitle: 'Enterprise Operations & Governance',
          badge: 'COMPANY ADMIN',
          variant: 'error' as const,
        };
      case 'SUPER_ADMIN':
        return {
          title: 'Super Admin Portal',
          subtitle: 'Platform Operations & Governance',
          badge: 'SUPER ADMIN',
          variant: 'error' as const,
        };
      case 'MASTER_SUPER_ADMIN':
        return {
          title: 'Master Super Admin Portal',
          subtitle: 'Master System Operations & Governance',
          badge: 'MASTER SUPER ADMIN',
          variant: 'error' as const,
        };
      default:
        return {
          title: 'Admin Portal',
          subtitle: 'Enterprise Operations & Governance',
          badge: user?.role || 'ADMIN',
          variant: 'error' as const,
        };
    }
  }, [user?.role]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Avatar
            name={user?.role === 'COMPANY_ADMIN' && company?.name ? company.name : user?.name}
            source={user?.role === 'COMPANY_ADMIN' && company?.companyLogoUrl ? company.companyLogoUrl : undefined}
            size="md"
          />
          <View style={styles.titleGroup}>
            <View style={styles.titleHeaderRow}>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
                {portalHeader.title}
              </Text>
              <Badge label={portalHeader.badge} variant={portalHeader.variant} size="sm" />
            </View>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
              {user?.role === 'COMPANY_ADMIN' && company?.name
                ? `${company.name} (${company.code})`
                : portalHeader.subtitle}
            </Text>
          </View>
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
              { label: 'Org Chart', icon: 'employees', onPress: () => navigation.navigate('OrgChart'), unreleased: false },
              { label: 'Policies', icon: 'attendance', onPress: () => navigation.navigate('Employees', { screen: 'AttendancePolicies' }), unreleased: false },
              { label: 'Requests', icon: 'attendance', onPress: () => navigation.navigate('Employees', { screen: 'ManagerRegularizations' }), badgeCount: pendingRequests.length, unreleased: false },
              { label: 'Clients', icon: 'customers', onPress: () => navigation.navigate('Customers'), unreleased: true },
              { label: 'Products', icon: 'products', onPress: () => navigation.navigate('Products'), unreleased: true },
              { label: 'Visits', icon: 'visits', onPress: () => navigation.navigate('Visits'), unreleased: true },
              { label: 'Sales', icon: 'sales', onPress: () => navigation.navigate('Sales'), unreleased: true },
            ].map((act) => (
              <TouchableOpacity
                key={act.label}
                onPress={() => {
                  if (act.unreleased) {
                    Alert.alert(
                      'Feature Coming Soon',
                      `${act.label} module is currently in active development and will be released in an upcoming update.`
                    );
                  } else {
                    act.onPress();
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

        {/* System Health Card (Super Admin & Master Super Admin only) */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER_SUPER_ADMIN') && (
          <Section title="System Status">
            <Card variant="elevated" style={styles.systemCard}>
              <View style={styles.systemRow}>
                <View style={[styles.systemIconBox, { backgroundColor: theme.colors.semantic.successBg }]}>
                  <AppIcon name="success" color={theme.colors.semantic.success} size={20} />
                </View>
                <View style={styles.systemTextGroup}>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                    All Microservices Operational
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    PostgreSQL, Redis, Socket.IO & R2 online
                  </Text>
                </View>
                <StatusBadge status="active" label="Healthy" />
              </View>
            </Card>
          </Section>
        )}

        {/* Organization KPIs */}
        <Section title="Organization Overview">
          <View style={styles.statsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Employees')}
              style={{ flex: 1 }}
            >
              <StatCard
                icon="employees"
                value={`${summary?.presentToday ?? 0} / ${summary?.totalEmployees ?? employees.length}`}
                label="Active Workforce"
                valueColor={theme.colors.brand.primary}
              />
            </TouchableOpacity>
            <StatCard
              icon="customers"
              value={customers.length}
              label="Total Clients"
              valueColor={theme.colors.semantic.success}
            />
            <StatCard
              icon="teamMap"
              value={user?.isGpsEnabled !== false ? 'Enabled' : 'Disabled'}
              label="GPS Tracking"
              valueColor={user?.isGpsEnabled !== false ? theme.colors.semantic.success : theme.colors.semantic.error}
            />
          </View>
        </Section>

        {/* Live Map Navigation Card */}
        <Card style={styles.mapCard}>
          <View style={styles.mapRow}>
            <View style={[styles.mapIconBox, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="teamMap" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.mapTextGroup}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Live Fleet & Team Tracking
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                Monitor real-time agent positions across all regions
              </Text>
            </View>
          </View>
          <Button
            label="Open Live Team Map"
            onPress={() => navigation.navigate('TeamMap')}
            variant="outline"
            size="md"
            icon="teamMap"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </Card>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleGroup: {
    marginLeft: 10,
    flex: 1,
  },
  titleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  systemCard: {
    padding: 14,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  systemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemTextGroup: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapCard: {
    marginTop: 16,
    padding: 14,
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
