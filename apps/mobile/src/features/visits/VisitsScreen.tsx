import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useVisits, useCreateVisit } from './hooks/useVisits';
import { useCustomers } from '../customers/hooks/useCustomers';
import { getCurrentCoords } from '../../shared/services/trackingService';
import type { VisitRecord } from './types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ─── Create Visit Form ────────────────────────────────────────────────────────
function CreateVisitForm({
  onClose,
  theme
}: {
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const createVisit = useCreateVisit();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [productsDiscussed, setProductsDiscussed] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    const coords = (await getCurrentCoords()) ?? { latitude: 0, longitude: 0 };
    createVisit.mutate(
      {
        customerId: selectedCustomerId,
        checkInTime: new Date().toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notes.trim() || undefined,
        productsDiscussed: productsDiscussed.trim() || undefined
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Visit recorded successfully.');
          onClose();
        },
        onError: (e) => Alert.alert('Error', e.message)
      }
    );
  };

  return (
    <View style={[s.form, { backgroundColor: theme.colors.surface.card }]}>
      <Text style={[s.formTitle, { color: theme.colors.text.primary }]}>Log New Visit</Text>

      {/* Customer selector */}
      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Customer *</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(!showPicker)}
        style={[s.selector, { backgroundColor: theme.colors.surface.input }]}
      >
        <Text style={{ color: selectedCustomer ? theme.colors.text.primary : theme.colors.text.tertiary }}>
          {selectedCustomer ? selectedCustomer.name : 'Select customer…'}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <View style={[s.pickerList, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.input }]}>
          {loadingCustomers && <ActivityIndicator color={theme.colors.brand.primary} />}
          {customers.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setSelectedCustomerId(c.id); setShowPicker(false); }}
              style={[s.pickerItem, { borderBottomColor: theme.colors.surface.input }]}
            >
              <Text style={{ color: theme.colors.text.primary }}>{c.name}</Text>
              {c.type && <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>{c.type}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Products Discussed</Text>
      <TextInput
        value={productsDiscussed}
        onChangeText={setProductsDiscussed}
        placeholder="e.g. Fertilizer X, Seed Y"
        placeholderTextColor={theme.colors.text.tertiary}
        style={[s.textInput, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional notes…"
        placeholderTextColor={theme.colors.text.tertiary}
        multiline
        numberOfLines={3}
        style={[s.textInput, s.multiline, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <View style={s.formActions}>
        <TouchableOpacity
          onPress={onClose}
          style={[s.cancelBtn, { borderColor: theme.colors.surface.input }]}
        >
          <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createVisit.isPending}
          style={[s.submitBtn, { backgroundColor: theme.colors.brand.primary, opacity: createVisit.isPending ? 0.6 : 1 }]}
        >
          {createVisit.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700' }}>Log Visit</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Visit Row ────────────────────────────────────────────────────────────────
function VisitRow({ visit, theme }: { visit: VisitRecord; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface.card }]}>
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>
          {visit.customer?.name ?? 'Customer'}
        </Text>
        <Text style={[s.cardDuration, { color: theme.colors.brand.primary }]}>
          {formatDuration(visit.duration)}
        </Text>
      </View>
      <Text style={[s.cardDate, { color: theme.colors.text.secondary }]}>
        {formatDate(visit.checkInTime)}
      </Text>
      {visit.productsDiscussed && (
        <Text style={[s.cardMeta, { color: theme.colors.text.tertiary }]} numberOfLines={1}>
          Products: {visit.productsDiscussed}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export function VisitsScreen() {
  const theme = useTheme();
  const { data: visits = [], isLoading, error } = useVisits();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <View>
            <Text style={[s.heading, { color: theme.colors.text.primary }]}>Visits</Text>
            <Text style={[s.sub, { color: theme.colors.text.secondary }]}>{visits.length} total</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={[s.addBtn, { backgroundColor: theme.colors.brand.primary }]}
          >
            <Text style={s.addBtnText}>{showForm ? '✕ Close' : '+ Log Visit'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && <CreateVisitForm onClose={() => setShowForm(false)} theme={theme} />}

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {error && (
          <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>
            {(error as Error).message}
          </Text>
        )}
        {!isLoading && visits.length === 0 && !showForm && (
          <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No visits logged yet.</Text>
        )}
        {visits.map((v) => (
          <VisitRow key={v.id} visit={v} theme={theme} />
        ))}
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
  cardDuration: { fontSize: 14, fontWeight: '600' },
  cardDate: { fontSize: 13, marginTop: 4 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  // Form
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
  pickerList: {
    borderRadius: 8, borderWidth: 1, marginBottom: 12,
    maxHeight: 180, overflow: 'scroll'
  },
  pickerItem: { padding: 12, borderBottomWidth: 1 },
  textInput: { borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  multiline: { height: 80, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 12, alignItems: 'center' },
  submitBtn: { flex: 2, borderRadius: 8, padding: 12, alignItems: 'center' }
});
