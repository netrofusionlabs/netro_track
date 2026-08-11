import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { useAuthStore } from '../../auth/stores/authStore';
import { Card } from '../../../shared/components/Card';
import { StatCard } from '../../../shared/components/StatCard';
import { ActionCard } from '../../../shared/components/ActionCard';
import { useAttendanceToday } from '../../attendance/hooks/useAttendance';
import { useTodayVisits } from '../../visits/hooks/useVisits';
import { useTodaySales } from '../../sales/hooks/useSales';

export function EmployeeDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: todayRecord } = useAttendanceToday();
  const { data: todayVisits = [] } = useTodayVisits();
  const { data: todaySales = [] } = useTodaySales();

  const isPunchedIn = !!todayRecord && !todayRecord.punchOutTime;
  const isPunchedOut = !!todayRecord && !!todayRecord.punchOutTime;

  const totalSalesAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount), 0
  );

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>
          Hello, {user?.name?.split(' ')[0] ?? 'Agent'} 👋
        </Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, marginBottom: 24 }]}>
          Field Agent · Today's Overview
        </Text>

        {/* Attendance status card */}
        <Card variant="elevated">
          <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 12 }]}>
            Attendance
          </Text>
          <Text style={[
            typography.headingSm,
            {
              color: isPunchedIn
                ? theme.colors.semantic.success
                : isPunchedOut
                ? theme.colors.semantic.info
                : theme.colors.semantic.warning,
              marginBottom: 16,
            },
          ]}>
            {isPunchedIn ? '● Punched In' : isPunchedOut ? '✓ Day Complete' : '○ Not Punched In'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Attendance')}
            style={[s.cardAction, { backgroundColor: theme.colors.brand.primary, borderRadius: theme.borderRadius.md }]}
            activeOpacity={0.8}
          >
            <Text style={[typography.button, { color: '#FFFFFF' }]}>
              {isPunchedIn ? 'Punch Out' : isPunchedOut ? 'View Record' : 'Punch In Now'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard
            icon="📍"
            value={todayVisits.length}
            label="Visits Today"
            valueColor={theme.colors.brand.primary}
          />
          <StatCard
            icon="💼"
            value={todaySales.length}
            label="Sales Today"
            valueColor={theme.colors.semantic.success}
          />
          <StatCard
            icon="💰"
            value={`₹${Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            label="Revenue"
            valueColor={theme.colors.brand.secondary}
          />
        </View>

        {/* Quick actions */}
        <Text style={[typography.overline, { color: theme.colors.text.secondary, marginBottom: 12, marginTop: 8 }]}>
          QUICK ACTIONS
        </Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Log Visit', icon: '📍', screen: 'Visits' },
            { label: 'Record Sale', icon: '💼', screen: 'Sales' },
            { label: 'Inspection', icon: '🔍', screen: 'Inspections' },
            { label: 'History', icon: '📋', screen: 'AttendanceHistory' },
          ].map((action) => (
            <ActionCard
              key={action.label}
              label={action.label}
              icon={action.icon}
              onPress={() => navigation.navigate(action.screen)}
            />
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
  cardAction: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
