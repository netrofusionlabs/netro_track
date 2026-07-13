import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useCustomers } from './hooks/useCustomers';

export function CustomerListScreen() {
  const theme = useTheme();
  const { data: customers = [], isLoading, error } = useCustomers();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>Customers</Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>
          {isLoading ? 'Loading…' : `${customers.length} accounts`}
        </Text>

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {error && (
          <Text style={[s.error, { color: theme.colors.semantic.error }]}>
            {(error as Error).message}
          </Text>
        )}
        {customers.map((c) => (
          <View key={c.id} style={[s.card, { backgroundColor: theme.colors.surface.card }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: theme.colors.text.primary }]}>{c.name}</Text>
                <Text style={[s.meta, { color: theme.colors.text.secondary }]}>
                  {[c.type, c.village, c.phone].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {c.type && (
                <View style={[s.badge, { backgroundColor: theme.colors.brand.primaryLight }]}>
                  <Text style={[s.badgeText, { color: theme.colors.brand.primary }]}>{c.type}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
        {!isLoading && customers.length === 0 && (
          <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No customers found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 20 },
  error: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: {
    borderRadius: 12, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 3 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' }
});
