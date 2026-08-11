import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import {
  ScreenHeader,
  ListItem,
  EmptyState,
  Badge,
  SearchInput,
  Avatar,
  LoadingState,
  BadgeVariant,
} from '../../shared/components';
import { useEmployees } from './hooks/useEmployees';

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoleBadgeVariant(role: string): BadgeVariant {
  switch (role) {
    case 'COMPANY_ADMIN':
      return 'warning';
    case 'MANAGER':
      return 'info';
    case 'SUPER_ADMIN':
      return 'error';
    default:
      return 'success';
  }
}

export function EmployeeListScreen() {
  const theme = useTheme();
  const { data: employees = [], isLoading } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.designation?.name?.toLowerCase().includes(q) ||
      emp.department?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Workforce"
          subtitle={`${employees.length} total employees`}
        />

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, ID, or department..."
        />

        {isLoading && <LoadingState message="Loading workforce directory..." />}

        {!isLoading && filteredEmployees.length === 0 && (
          <EmptyState
            icon="employees"
            title={searchQuery ? 'No Employees Match' : 'No Employees'}
            subtitle={
              searchQuery
                ? `No employees found matching "${searchQuery}".`
                : 'Your company workforce will appear here.'
            }
          />
        )}

        {filteredEmployees.map((emp) => {
          const variant = getRoleBadgeVariant(emp.role);
          const details = [
            emp.designation?.name,
            emp.department?.name,
            emp.branch?.name,
          ].filter(Boolean).join(' · ') || emp.employeeId;

          return (
            <ListItem
              key={emp.id}
              avatar={<Avatar name={emp.name} size="md" />}
              title={emp.name}
              subtitle={details}
              trailing={
                <Badge
                  label={formatRole(emp.role)}
                  variant={variant}
                  size="sm"
                />
              }
              showChevron
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
});
