import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Divider } from '../../shared/components/Divider';
import { useSales, useCreateSale } from './hooks/useSales';
import { useCustomers } from '../customers/hooks/useCustomers';
import { useProducts } from '../products/hooks/useProducts';
import type { SaleRecord, CreateSaleItemPayload } from './types';

function SaleCard({ sale, theme }: { sale: SaleRecord; theme: ReturnType<typeof useTheme> }) {
  return (
    <Card style={{ paddingVertical: 16, paddingHorizontal: 18 }}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
            {sale.customer?.name ?? 'Unknown'}
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(sale.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Badge
          label={`₹${Number(sale.totalAmount).toLocaleString('en-IN')}`}
          color={theme.colors.semantic.success}
          backgroundColor="#E8F5E9"
          size="md"
        />
      </View>
      {sale.remarks && (
        <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 10 }]} numberOfLines={2}>
          📝 {sale.remarks}
        </Text>
      )}
    </Card>
  );
}

export function SalesScreen() {
  const theme = useTheme();
  const { data: sales = [], isLoading } = useSales();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const createSale = useCreateSale();

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cart, setCart] = useState<CreateSaleItemPayload[]>([]);

  const addToCart = useCallback((productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, quantity: 1, price: Number(product.price ?? 0) }];
    });
  }, [products]);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = useCallback(() => {
    if (!selectedCustomerId) { Alert.alert('Required', 'Please select a customer'); return; }
    if (cart.length === 0) { Alert.alert('Required', 'Please add items to cart'); return; }

    createSale.mutate(
      { customerId: selectedCustomerId, remarks: remarks || undefined, items: cart },
      {
        onSuccess: () => {
          setShowForm(false);
          setSelectedCustomerId('');
          setRemarks('');
          setCart([]);
          Alert.alert('Success', 'Sale recorded successfully');
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [selectedCustomerId, remarks, cart, createSale]);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Sales"
          subtitle={`${sales.length} total records`}
          actionLabel={showForm ? 'Cancel' : '+ New'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card variant="elevated" style={{ marginBottom: 24 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Record Sale
            </Text>

            {/* Customer picker */}
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 8 }]}>
              Customer
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCustomerId(c.id)}
                  style={[s.chip, {
                    backgroundColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.input,
                    borderRadius: theme.borderRadius.md,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodySm, {
                    color: selectedCustomerId === c.id ? '#FFFFFF' : theme.colors.text.primary,
                    fontWeight: '600',
                  }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product picker */}
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 8 }]}>
              Add Products
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {products
                .filter((p) => p.isActive)
                .map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => addToCart(p.id)}
                    style={[s.chip, {
                      backgroundColor: theme.colors.surface.input,
                      borderRadius: theme.borderRadius.md,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                      {p.name} · ₹{Number(p.price ?? 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cart */}
            {cart.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <View key={item.productId} style={s.cartItem}>
                      <Text style={[typography.bodyMd, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                        {product?.name ?? item.productId}
                      </Text>
                      <View style={s.qtyControls}>
                        <TouchableOpacity onPress={() => updateQuantity(item.productId, -1)} style={[s.qtyBtn, { backgroundColor: theme.colors.surface.input }]}>
                          <Text style={[typography.bodyLg, { color: theme.colors.text.primary }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[typography.bodyMd, { color: theme.colors.text.primary, minWidth: 28, textAlign: 'center' }]}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity onPress={() => updateQuantity(item.productId, 1)} style={[s.qtyBtn, { backgroundColor: theme.colors.brand.primaryLight }]}>
                          <Text style={[typography.bodyLg, { color: theme.colors.brand.primary }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary, width: 80, textAlign: 'right' }]}>
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
                <Divider spacing={12} />
                <View style={s.totalRow}>
                  <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Total</Text>
                  <Text style={[typography.headingMd, { color: theme.colors.semantic.success }]}>
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            <Input label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Optional notes..." multiline numberOfLines={2} />
            <Button label="Record Sale" onPress={handleSubmit} loading={createSale.isPending} size="lg" />
          </Card>
        )}

        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />}
        {!isLoading && sales.length === 0 && (
          <EmptyState icon="💼" title="No Sales Yet" subtitle="Tap '+ New' to record your first sale." />
        )}
        {sales.map((sale) => (
          <SaleCard key={sale.id} sale={sale} theme={theme} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
