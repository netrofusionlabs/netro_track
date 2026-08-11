import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Input,
  Button,
  Badge,
  AppIcon,
  IconButton,
  Divider,
  LoadingState,
} from '../../shared/components';
import { useCreateSale } from './hooks/useSales';
import { useCustomers } from '../customers/hooks/useCustomers';
import { useProducts } from '../products/hooks/useProducts';
import type { CreateSaleItemPayload } from './types';

interface Props {
  navigation: any;
}

export function NewSaleScreen({ navigation }: Props) {
  const theme = useTheme();

  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createSale = useCreateSale();

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
    if (cart.length === 0) { Alert.alert('Required', 'Please add at least one item to the order'); return; }

    createSale.mutate(
      { customerId: selectedCustomerId, remarks: remarks.trim() || undefined, items: cart },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Sale recorded successfully', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [selectedCustomerId, remarks, cart, createSale, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Record New Sale</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Customer Selection */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 8 }]}>
              Select Customer *
            </Text>
            {loadingCustomers ? (
              <LoadingState message="Loading customers..." />
            ) : customers.length === 0 ? (
              <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]}>No customers available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCustomerId(c.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.subtle,
                        borderColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.border,
                      },
                    ]}
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
            )}
          </Card>

          {/* Product Picker */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Add Products to Order *
            </Text>
            {loadingProducts ? (
              <LoadingState message="Loading products..." />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
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
            )}
          </Card>

          {/* Cart */}
          {cart.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
                Order Summary
              </Text>
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
                <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Order Total</Text>
                <Badge
                  label={`₹${cartTotal.toLocaleString('en-IN')}`}
                  variant="success"
                  size="md"
                />
              </View>
            </Card>
          )}

          {/* Remarks */}
          <Card style={{ marginBottom: 24 }}>
            <Input
              label="Remarks / Notes"
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. Paid via UPI, discount applied..."
              multiline
              numberOfLines={3}
            />
          </Card>

          <Button
            label="Submit Order"
            onPress={handleSubmit}
            loading={createSale.isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
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
  },
});
