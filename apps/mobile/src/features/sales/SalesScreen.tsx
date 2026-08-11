import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Badge,
  EmptyState,
  ScreenHeader,
  Input,
  Button,
  Divider,
  AppIcon,
  IconButton,
  LoadingState,
} from '../../shared/components';
import { useSales, useCreateSale } from './hooks/useSales';
import { useCustomers } from '../customers/hooks/useCustomers';
import { useProducts } from '../products/hooks/useProducts';
import type { SaleRecord, CreateSaleItemPayload } from './types';

function SaleCard({ sale }: { sale: SaleRecord }) {
  const theme = useTheme();
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="sales" color={theme.colors.semantic.success} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {sale.customer?.name ?? 'Unknown Customer'}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(sale.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Badge
          label={`₹${Number(sale.totalAmount).toLocaleString('en-IN')}`}
          variant="success"
          size="md"
        />
      </View>
      {sale.remarks && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {sale.remarks}
          </Text>
        </View>
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
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Sales"
          subtitle={`${sales.length} total transactions`}
          actionLabel={showForm ? 'Cancel' : '+ Record'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              Record New Sale
            </Text>

            {/* Customer picker */}
            <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
              Select Customer
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCustomerId(c.id)}
                  style={[styles.chip, {
                    backgroundColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.subtle,
                    borderColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodySm, {
                    color: selectedCustomerId === c.id ? theme.colors.text.inverse : theme.colors.text.primary,
                    fontWeight: '600',
                  }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product picker */}
            <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
              Add Products to Order
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {products
                .filter((p) => p.isActive)
                .map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => addToCart(p.id)}
                    style={[styles.chip, {
                      backgroundColor: theme.colors.surface.subtle,
                      borderColor: theme.colors.surface.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                      + {p.name} · ₹{Number(p.price ?? 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cart */}
            {cart.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <View key={item.productId} style={styles.cartItem}>
                      <Text style={[typography.bodyMd, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                        {product?.name ?? item.productId}
                      </Text>
                      <View style={styles.qtyControls}>
                        <IconButton
                          icon="close"
                          onPress={() => updateQuantity(item.productId, -1)}
                          variant="default"
                          size="sm"
                        />
                        <Text style={[typography.headingSm, { color: theme.colors.text.primary, minWidth: 24, textAlign: 'center' }]}>
                          {item.quantity}
                        </Text>
                        <IconButton
                          icon="plus"
                          onPress={() => addToCart(item.productId)}
                          variant="primary"
                          size="sm"
                        />
                      </View>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary, width: 70, textAlign: 'right' }]}>
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
                <Divider spacing={8} />
                <View style={styles.totalRow}>
                  <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Total</Text>
                  <Text style={[typography.headingLg, { color: theme.colors.semantic.success }]}>
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            <Input
              label="Remarks / Notes"
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. Paid via UPI, discount applied..."
            />

            <Button
              label="Submit Order"
              onPress={handleSubmit}
              loading={createSale.isPending}
              fullWidth
              size="md"
            />
          </Card>
        )}

        {isLoading && <LoadingState message="Loading sales records..." />}

        {!isLoading && sales.length === 0 && (
          <EmptyState
            icon="sales"
            title="No Sales Transactions"
            subtitle="Record your first product sale to track your revenue."
            actionLabel="Record Sale"
            onAction={() => setShowForm(true)}
          />
        )}

        {sales.map((sItem) => (
          <SaleCard key={sItem.id} sale={sItem} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
});
