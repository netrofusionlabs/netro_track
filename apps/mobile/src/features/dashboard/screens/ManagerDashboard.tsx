import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { useAuthStore } from '../../auth/stores/authStore';
import { Card } from '../../../shared/components/Card';
import { StatCard } from '../../../shared/components/StatCard';
import { ActionCard } from '../../../shared/components/ActionCard';
import { useTodayVisits } from '../../visits/hooks/useVisits';
import { useTodaySales } from '../../sales/hooks/useSales';
import { useTodayInspections } from '../../inspections/hooks/useInspections';

export function ManagerDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: todayVisits = [] } = useTodayVisits();
  const { data: todaySales = [] } = useTodaySales();
  const { data: todayInspections = [] } = useTodayInspections();

  const totalSalesAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount), 0
  );

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>
          Hello, {user?.name?.split(' ')[0] ?? 'Manager'} 👋
        </Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, marginBottom: 24 }]}>
          Team Supervisor · Today's Overview
        </Text>

        {/* Team metrics */}
        <View style={s.statsRow}>
          <StatCard icon="📍" value={todayVisits.length} label="Team Visits" valueColor={theme.colors.brand.primary} />
          <StatCard icon="💼" value={todaySales.length} label="Team Sales" valueColor={theme.colors.semantic.success} />
          <StatCard icon="🔍" value={todayInspections.length} label="Inspections" valueColor={theme.colors.brand.secondary} />
        </View>

        {/* Revenue card */}
        <Card variant="elevated">
          <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 8 }]}>
            Revenue Today
          </Text>
          <Text style={[typography.displayLg, { color: theme.colors.semantic.success }]}>
            ₹{Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </Card>

        <Text style={[typography.overline, { color: theme.colors.text.secondary, marginBottom: 12, marginTop: 8 }]}>
          QUICK LINKS
        </Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Visits', icon: '📍', screen: 'Visits' },
            { label: 'Sales', icon: '💼', screen: 'Sales' },
            { label: 'Agents', icon: '👥', screen: 'Employees' },
            { label: 'Inspections', icon: '🔍', screen: 'Inspections' },
          ].map((a) => (
            <ActionCard key={a.label} label={a.label} icon={a.icon} onPress={() => navigation.navigate(a.screen)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
});
