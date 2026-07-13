import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useSales, useCreateSale } from './hooks/useSales';
import { useCustomers } from '../customers/hooks/useCustomers';
import { useProducts } from '../products/hooks/useProducts';
import type { SaleRecord, CreateSaleItemPayload } from './types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(n: number): string {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Create Sale Form ─────────────────────────────────────────────────────────
function CreateSaleForm({
  onClose,
  theme
}: {
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createSale = useCreateSale();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cartItems, setCartItems] = useState<CreateSaleItemPayload[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalAmount = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addProduct = (productId: string, defaultPrice: number) => {
    const existing = cartItems.find((i) => i.productId === productId);
    if (existing) {
      setCartItems(cartItems.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCartItems([...cartItems, { productId, quantity: 1, price: defaultPrice }]);
    }
    setShowProductPicker(false);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(cartItems.filter((i) => i.productId !== productId));
    } else {
      setCartItems(cartItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  const handleSubmit = () => {
    if (!selectedCustomerId) { Alert.alert('Validation', 'Please select a customer.'); return; }
    if (cartItems.length === 0) { Alert.alert('Validation', 'Add at least one product.'); return; }
    createSale.mutate(
      { customerId: selectedCustomerId, remarks: remarks.trim() || undefined, items: cartItems },
      {
        onSuccess: () => { Alert.alert('Success', 'Sale logged successfully.'); onClose(); },
        onError: (e) => Alert.alert('Error', e.message)
      }
    );
  };

  return (
    <View style={[s.form, { backgroundColor: theme.colors.surface.card }]}>
      <Text style={[s.formTitle, { color: theme.colors.text.primary }]}>New Sale</Text>

      {/* Customer */}
      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Customer *</Text>
      <TouchableOpacity
        onPress={() => setShowCustomerPicker(!showCustomerPicker)}
        style={[s.selector, { backgroundColor: theme.colors.surface.input }]}
      >
        <Text style={{ color: selectedCustomer ? theme.colors.text.primary : theme.colors.text.tertiary }}>
          {selectedCustomer ? selectedCustomer.name : 'Select customer…'}
        </Text>
      </TouchableOpacity>
      {showCustomerPicker && (
        <View style={[s.pickerList, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.input }]}>
          {loadingCustomers && <ActivityIndicator color={theme.colors.brand.primary} />}
          {customers.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setSelectedCustomerId(c.id); setShowCustomerPicker(false); }}
              style={[s.pickerItem, { borderBottomColor: theme.colors.surface.input }]}
            >
              <Text style={{ color: theme.colors.text.primary }}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cart */}
      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Products *</Text>
      {cartItems.map((item) => {
        const p = products.find((pr) => pr.id === item.productId);
        return (
          <View key={item.productId} style={[s.cartRow, { borderColor: theme.colors.surface.input }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cartName, { color: theme.colors.text.primary }]}>{p?.name ?? item.productId}</Text>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
            <View style={s.qtyRow}>
              <TouchableOpacity onPress={() => updateQty(item.productId, item.quantity - 1)}
                style={[s.qtyBtn, { backgroundColor: theme.colors.surface.input }]}>
                <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>−</Text>
              </TouchableOpacity>
              <Text style={[s.qtyVal, { color: theme.colors.text.primary }]}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQty(item.productId, item.quantity + 1)}
                style={[s.qtyBtn, { backgroundColor: theme.colors.brand.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <TouchableOpacity
        onPress={() => setShowProductPicker(!showProductPicker)}
        style={[s.addProductBtn, { borderColor: theme.colors.brand.primary }]}
      >
        <Text style={{ color: theme.colors.brand.primary, fontWeight: '600', fontSize: 13 }}>+ Add Product</Text>
      </TouchableOpacity>
      {showProductPicker && (
        <View style={[s.pickerList, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.input }]}>
          {loadingProducts && <ActivityIndicator color={theme.colors.brand.primary} />}
          {products.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => addProduct(p.id, p.price ?? 0)}
              style={[s.pickerItem, { borderBottomColor: theme.colors.surface.input }]}
            >
              <Text style={{ color: theme.colors.text.primary }}>{p.name}</Text>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                {p.sku ? `SKU: ${p.sku}` : ''} {p.price != null ? `· ${formatCurrency(p.price)}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {cartItems.length > 0 && (
        <View style={[s.totalRow, { borderTopColor: theme.colors.surface.input }]}>
          <Text style={[s.totalLabel, { color: theme.colors.text.secondary }]}>Total</Text>
          <Text style={[s.totalVal, { color: theme.colors.text.primary }]}>{formatCurrency(totalAmount)}</Text>
        </View>
      )}

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Remarks</Text>
      <TextInput
        value={remarks}
        onChangeText={setRemarks}
        placeholder="Optional remarks…"
        placeholderTextColor={theme.colors.text.tertiary}
        style={[s.textInput, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <View style={s.formActions}>
        <TouchableOpacity onPress={onClose}
          style={[s.cancelBtn, { borderColor: theme.colors.surface.input }]}>
          <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} disabled={createSale.isPending}
          style={[s.submitBtn, { backgroundColor: theme.colors.brand.primary, opacity: createSale.isPending ? 0.6 : 1 }]}>
          {createSale.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700' }}>Save Sale</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sale Row ─────────────────────────────────────────────────────────────────
function SaleRow({ sale, theme }: { sale: SaleRecord; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface.card }]}>
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>
          {sale.customer?.name ?? 'Customer'}
        </Text>
        <Text style={[s.cardAmount, { color: theme.colors.semantic.success }]}>
          {formatCurrency(sale.totalAmount)}
        </Text>
      </View>
      <Text style={[s.cardDate, { color: theme.colors.text.secondary }]}>{formatDate(sale.createdAt)}</Text>
      <Text style={[s.cardItems, { color: theme.colors.text.tertiary }]}>
        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
        {sale.items.map((i) => i.product?.name).filter(Boolean).join(', ')
          ? ` · ${sale.items.map((i) => i.product?.name).filter(Boolean).join(', ')}`
          : ''}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export function SalesScreen() {
  const theme = useTheme();
  const { data: sales = [], isLoading, error } = useSales();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <View>
            <Text style={[s.heading, { color: theme.colors.text.primary }]}>Sales</Text>
            <Text style={[s.sub, { color: theme.colors.text.secondary }]}>{sales.length} records</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={[s.addBtn, { backgroundColor: theme.colors.brand.primary }]}
          >
            <Text style={s.addBtnText}>{showForm ? '✕ Close' : '+ New Sale'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && <CreateSaleForm onClose={() => setShowForm(false)} theme={theme} />}

        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />}
        {error && <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>{(error as Error).message}</Text>}
        {!isLoading && sales.length === 0 && !showForm && (
          <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No sales recorded yet.</Text>
        )}
        {sales.map((sale) => <SaleRow key={sale.id} sale={sale} theme={theme} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  addBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: {
    borderRadius: 12, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardDate: { fontSize: 13, marginTop: 4 },
  cardItems: { fontSize: 12, marginTop: 4 },
  form: {
    borderRadius: 14, padding: 20, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },
  formTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  selector: { borderRadius: 8, padding: 12, marginBottom: 12 },
  pickerList: { borderRadius: 8, borderWidth: 1, marginBottom: 12, maxHeight: 200 },
  pickerItem: { padding: 12, borderBottomWidth: 1 },
  textInput: { borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  cartRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  cartName: { fontSize: 14, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtyVal: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  addProductBtn: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginBottom: 12 },
  totalLabel: { fontSize: 15, fontWeight: '600' },
  totalVal: { fontSize: 17, fontWeight: '800' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 12, alignItems: 'center' },
  submitBtn: { flex: 2, borderRadius: 8, padding: 12, alignItems: 'center' }
});
