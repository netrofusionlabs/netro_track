import React from 'react';
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { ListItem } from '../../shared/components/ListItem';
import { EmptyState } from '../../shared/components/EmptyState';
import { Badge } from '../../shared/components/Badge';
import { useEmployees } from './hooks/useEmployees';

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoleColor(role: string) {
  switch (role) {
    case 'COMPANY_ADMIN': return { bg: '#FFF3E0', fg: '#E65100' };
    case 'MANAGER': return { bg: '#E3F2FD', fg: '#1565C0' };
    case 'SUPER_ADMIN': return { bg: '#FCE4EC', fg: '#C62828' };
    default: return { bg: '#E8F5E9', fg: '#2E7D32' };
  }
}

export function EmployeeListScreen() {
  const theme = useTheme();
  const { data: employees = [], isLoading } = useEmployees();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Workforce"
          subtitle={`${employees.length} employees`}
        />

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {!isLoading && employees.length === 0 && (
          <EmptyState
            icon="👥"
            title="No Employees"
            subtitle="Your company workforce will appear here."
          />
        )}
        {employees.map((emp) => {
          const colors = getRoleColor(emp.role);
          const details = [
            emp.designation?.name,
            emp.department?.name,
            emp.branch?.name,
          ].filter(Boolean).join(' · ') || emp.employeeId;

          return (
            <ListItem
              key={emp.id}
              icon="👤"
              title={emp.name}
              subtitle={details}
              trailing={
                <Badge
                  label={formatRole(emp.role)}
                  color={colors.fg}
                  backgroundColor={colors.bg}
                  size="sm"
                />
              }
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
});
