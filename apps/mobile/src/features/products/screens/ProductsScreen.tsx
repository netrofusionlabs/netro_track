import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import {
  Card,
  ScreenHeader,
  EmptyState,
  StatusBadge,
  AppIcon,
  SearchInput,
  LoadingState,
} from '../../../shared/components';
import { api } from '../../../shared/services/api';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  isActive: boolean;
}

export function ProductsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

  useRefreshOnFocus(refetch);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Product Catalog"
          subtitle={`${products.length} registered items`}
          onBackPress={() => {
            if (navigation) {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                const parent = navigation.getParent();
                if (parent && parent.canGoBack()) {
                  parent.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }
            }
          }}
        />

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by product name or SKU..."
        />

        {isLoading && <LoadingState message="Loading product catalog..." />}

        {!isLoading && filteredProducts.length === 0 && (
          <EmptyState
            icon="products"
            title={searchQuery ? 'No Products Match' : 'No Products Found'}
            subtitle={
              searchQuery
                ? `No products match "${searchQuery}".`
                : 'Your product catalog is empty.'
            }
          />
        )}

        {filteredProducts.map((p) => (
          <Card key={p.id} style={{ paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="products" color={theme.colors.brand.primary} size={18} />
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                    {p.name}
                  </Text>
                </View>
                {p.sku && (
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    SKU: {p.sku}
                  </Text>
                )}
              </View>
              <Text style={[typography.headingSm, { color: theme.colors.semantic.success }]}>
                ₹{Number(p.price || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <StatusBadge
                status={p.isActive ? 'active' : 'offline'}
                label={p.isActive ? 'Active' : 'Inactive'}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
