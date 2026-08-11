import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Card } from '../../../shared/components/Card';
import { ActionCard } from '../../../shared/components/ActionCard';

export function AdminDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Admin Portal</Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, marginBottom: 24 }]}>
          Company Operations Dashboard
        </Text>

        <Card variant="elevated">
          <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 8 }]}>
            System Health
          </Text>
          <Text style={[typography.headingSm, { color: theme.colors.semantic.success }]}>
            ● Connected — All Services Online
          </Text>
        </Card>

        <Text style={[typography.overline, { color: theme.colors.text.secondary, marginBottom: 12, marginTop: 8 }]}>
          MANAGE
        </Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Workforce', icon: '👥', screen: 'Employees' },
            { label: 'Customers', icon: '🏢', screen: 'Customers' },
            { label: 'Products', icon: '📦', screen: 'Products' },
            { label: 'Visits', icon: '📍', screen: 'Visits' },
            { label: 'Sales', icon: '💼', screen: 'Sales' },
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
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
});
