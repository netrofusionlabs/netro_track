import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useInspections, useCreateInspection } from './hooks/useInspections';
import { getCurrentCoords } from '../../shared/services/trackingService';
import type { InspectionRecord } from './types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Create Inspection Form ───────────────────────────────────────────────────
function CreateInspectionForm({
  onClose,
  theme
}: {
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const createInspection = useCreateInspection();
  const [siteName, setSiteName] = useState('');
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const handleSubmit = async () => {
    if (!siteName.trim()) { Alert.alert('Validation', 'Site name is required.'); return; }
    if (!observation.trim()) { Alert.alert('Validation', 'Observation is required.'); return; }
    const coords = (await getCurrentCoords()) ?? { latitude: 0, longitude: 0 };
    createInspection.mutate(
      {
        siteName: siteName.trim(),
        category: category.trim() || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
        observation: observation.trim(),
        recommendation: recommendation.trim() || undefined,
        imageUrls: []
      },
      {
        onSuccess: () => { Alert.alert('Success', 'Inspection submitted.'); onClose(); },
        onError: (e) => Alert.alert('Error', e.message)
      }
    );
  };

  return (
    <View style={[s.form, { backgroundColor: theme.colors.surface.card }]}>
      <Text style={[s.formTitle, { color: theme.colors.text.primary }]}>New Inspection</Text>

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Site Name *</Text>
      <TextInput
        value={siteName}
        onChangeText={setSiteName}
        placeholder="e.g. North Field Block A"
        placeholderTextColor={theme.colors.text.tertiary}
        style={[s.textInput, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Category</Text>
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Crop, Infrastructure, Safety"
        placeholderTextColor={theme.colors.text.tertiary}
        style={[s.textInput, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Observation *</Text>
      <TextInput
        value={observation}
        onChangeText={setObservation}
        placeholder="Describe what was observed…"
        placeholderTextColor={theme.colors.text.tertiary}
        multiline
        numberOfLines={4}
        style={[s.textInput, s.multiline, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <Text style={[s.fieldLabel, { color: theme.colors.text.secondary }]}>Recommendation</Text>
      <TextInput
        value={recommendation}
        onChangeText={setRecommendation}
        placeholder="Suggested action (optional)…"
        placeholderTextColor={theme.colors.text.tertiary}
        multiline
        numberOfLines={3}
        style={[s.textInput, s.multiline, { backgroundColor: theme.colors.surface.input, color: theme.colors.text.primary }]}
      />

      <View style={[s.infoBox, { backgroundColor: theme.colors.surface.input }]}>
        <Text style={[s.infoText, { color: theme.colors.text.tertiary }]}>
          📷 Photo capture will be available in Phase 5 (Camera integration).
        </Text>
      </View>

      <View style={s.formActions}>
        <TouchableOpacity onPress={onClose}
          style={[s.cancelBtn, { borderColor: theme.colors.surface.input }]}>
          <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} disabled={createInspection.isPending}
          style={[s.submitBtn, { backgroundColor: theme.colors.brand.primary, opacity: createInspection.isPending ? 0.6 : 1 }]}>
          {createInspection.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Inspection Row ───────────────────────────────────────────────────────────
function InspectionRow({ record, theme }: { record: InspectionRecord; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface.card }]}>
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>{record.siteName}</Text>
        {record.category && (
          <View style={[s.badge, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <Text style={[s.badgeText, { color: theme.colors.brand.primary }]}>{record.category}</Text>
          </View>
        )}
      </View>
      <Text style={[s.cardDate, { color: theme.colors.text.secondary }]}>{formatDate(record.createdAt)}</Text>
      <Text style={[s.cardObs, { color: theme.colors.text.secondary }]} numberOfLines={2}>
        {record.observation}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export function InspectionsScreen() {
  const theme = useTheme();
  const { data: inspections = [], isLoading, error } = useInspections();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <View>
            <Text style={[s.heading, { color: theme.colors.text.primary }]}>Inspections</Text>
            <Text style={[s.sub, { color: theme.colors.text.secondary }]}>{inspections.length} records</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={[s.addBtn, { backgroundColor: theme.colors.brand.primary }]}
          >
            <Text style={s.addBtnText}>{showForm ? '✕ Close' : '+ New'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && <CreateInspectionForm onClose={() => setShowForm(false)} theme={theme} />}

        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />}
        {error && <Text style={[s.errorText, { color: theme.colors.semantic.error }]}>{(error as Error).message}</Text>}
        {!isLoading && inspections.length === 0 && !showForm && (
          <Text style={[s.empty, { color: theme.colors.text.tertiary }]}>No inspections recorded yet.</Text>
        )}
        {inspections.map((r) => <InspectionRow key={r.id} record={r} theme={theme} />)}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardDate: { fontSize: 13, marginBottom: 6 },
  cardObs: { fontSize: 13, lineHeight: 18 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  form: {
    borderRadius: 14, padding: 20, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },
  formTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  textInput: { borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  multiline: { height: 90, textAlignVertical: 'top' },
  infoBox: { borderRadius: 8, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 12, lineHeight: 18 },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 12, alignItems: 'center' },
  submitBtn: { flex: 2, borderRadius: 8, padding: 12, alignItems: 'center' }
});
