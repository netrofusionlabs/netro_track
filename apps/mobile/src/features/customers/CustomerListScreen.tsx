import React from 'react';
import { ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { ListItem } from '../../shared/components/ListItem';
import { EmptyState } from '../../shared/components/EmptyState';
import { Badge } from '../../shared/components/Badge';
import { useCustomers } from './hooks/useCustomers';

export function CustomerListScreen() {
  const theme = useTheme();
  const { data: customers = [], isLoading } = useCustomers();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Customers"
          subtitle={`${customers.length} total`}
        />

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {!isLoading && customers.length === 0 && (
          <EmptyState
            icon="🏢"
            title="No Customers"
            subtitle="Customers added by your company admin will appear here."
          />
        )}
        {customers.map((c) => (
          <ListItem
            key={c.id}
            icon="🏢"
            title={c.name}
            subtitle={[c.phone, c.email, c.village].filter(Boolean).join(' · ') || 'No contact info'}
            trailing={
              c.type ? (
                <Badge label={c.type} size="sm" />
              ) : undefined
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
});
