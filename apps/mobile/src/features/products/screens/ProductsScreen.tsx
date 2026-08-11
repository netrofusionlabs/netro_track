import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Card } from '../../../shared/components/Card';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/Badge';
import { api } from '../../../shared/services/api';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  isActive: boolean;
}

export function ProductsScreen() {
  const theme = useTheme();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    }
  });

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Product Catalog"
          subtitle={`${products.length} products available`}
          actionLabel="+ Add"
          onAction={() => {}}
        />

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}

        {!isLoading && products.length === 0 && (
          <EmptyState
            icon="📦"
            title="No Products Found"
            subtitle="Your product catalog is empty."
          />
        )}

        {products.map((p) => (
          <Card key={p.id} style={{ paddingVertical: 16, paddingHorizontal: 18, marginBottom: 12 }}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  {p.name}
                </Text>
                {p.sku && (
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    SKU: {p.sku}
                  </Text>
                )}
              </View>
              <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                ₹{Number(p.price || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              <Badge 
                label={p.isActive ? 'Active' : 'Inactive'} 
                color={p.isActive ? theme.colors.semantic.success : theme.colors.semantic.error} 
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
