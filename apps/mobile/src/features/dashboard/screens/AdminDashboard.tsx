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
  Avatar,
  Section,
  AppIcon,
  Button,
} from '../../../shared/components';
import { useCustomers } from '../../customers/hooks/useCustomers';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';

export function AdminDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: customers = [], refetch: r1 } = useCustomers();
  const { data: employees = [], refetch: r2 } = useEmployees();

  useRefreshOnFocus(React.useCallback(() => {
    void r1();
    void r2();
  }, [r1, r2]));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.greetingGroup}>
            <Avatar name={user?.name} size="md" />
            <View style={{ marginLeft: 10 }}>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
                Admin Portal
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                Enterprise Operations & Governance
              </Text>
            </View>
          </View>
          <Badge label="ADMIN" variant="error" size="sm" />
        </View>

        {/* System Health Card */}
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

        {/* Organization KPIs */}
        <Section title="Organization Overview">
          <View style={styles.statsRow}>
            <StatCard
              icon="employees"
              value={employees.length}
              label="Workforce"
              valueColor={theme.colors.brand.primary}
            />
            <StatCard
              icon="customers"
              value={customers.length}
              label="Total Clients"
              valueColor={theme.colors.semantic.success}
            />
            <StatCard
              icon="teamMap"
              value="Live"
              label="GPS Tracking"
              valueColor={theme.colors.brand.secondary}
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

        {/* Enterprise Management Actions */}
        <Section title="Enterprise Management">
          <View style={styles.actionsGrid}>
            {[
              { label: 'Workforce', icon: 'employees', screen: 'Employees' },
              { label: 'Clients', icon: 'customers', screen: 'Customers' },
              { label: 'Products', icon: 'products', screen: 'Products' },
              { label: 'Visits', icon: 'visits', screen: 'Visits' },
              { label: 'Sales', icon: 'sales', screen: 'Sales' },
            ].map((act) => (
              <Card
                key={act.label}
                onPress={() => navigation.navigate(act.screen)}
                style={styles.actionChip}
              >
                <View style={[styles.actionIconBox, { backgroundColor: theme.colors.brand.primaryLight }]}>
                  <AppIcon name={act.icon} color={theme.colors.brand.primary} size={18} />
                </View>
                <Text style={[typography.buttonSm, { color: theme.colors.text.primary, marginTop: 6 }]} numberOfLines={1}>
                  {act.label}
                </Text>
              </Card>
            ))}
          </View>
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
  greetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 8,
  },
  actionChip: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
