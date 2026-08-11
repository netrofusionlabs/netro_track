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
import { CameraCapture } from '../../shared/components/CameraCapture';
import { useVisits, useCreateVisit } from './hooks/useVisits';
import { useCustomers } from '../customers/hooks/useCustomers';
import type { VisitRecord } from './types';

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function VisitCard({ visit, theme }: { visit: VisitRecord; theme: ReturnType<typeof useTheme> }) {
  const complete = !!visit.checkOutTime;
  return (
    <Card style={{ paddingVertical: 16, paddingHorizontal: 18 }}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
            {visit.customer?.name ?? 'Unknown'}
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {formatDate(visit.checkInTime)} · {formatTime(visit.checkInTime)} → {formatTime(visit.checkOutTime)}
          </Text>
        </View>
        <Badge
          label={complete ? 'Complete' : 'Active'}
          color={complete ? theme.colors.semantic.success : theme.colors.semantic.warning}
          backgroundColor={complete ? '#E8F5E9' : '#FFF8E1'}
        />
      </View>
      {visit.productsDiscussed && (
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 10 }]} numberOfLines={2}>
          📦 {visit.productsDiscussed}
        </Text>
      )}
      {visit.notes && (
        <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 4 }]} numberOfLines={2}>
          📝 {visit.notes}
        </Text>
      )}
    </Card>
  );
}

export function VisitsScreen() {
  const theme = useTheme();
  const { data: visits = [], isLoading } = useVisits();
  const { data: customers = [] } = useCustomers();
  const createVisit = useCreateVisit();

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [productsDiscussed, setProductsDiscussed] = useState('');
  const [notes, setNotes] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!selectedCustomerId) {
      Alert.alert('Required', 'Please select a customer');
      return;
    }
    createVisit.mutate(
      {
        customerId: selectedCustomerId,
        checkInTime: new Date().toISOString(),
        latitude: 0,
        longitude: 0,
        productsDiscussed: productsDiscussed || undefined,
        notes: notes || undefined,
        imageUrl: imageUrl || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setSelectedCustomerId('');
          setProductsDiscussed('');
          setNotes('');
          setImageUrl(null);
          Alert.alert('Success', 'Visit logged successfully');
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [selectedCustomerId, productsDiscussed, notes, createVisit]);

  if (showCamera) {
    return (
      <CameraCapture 
        onCancel={() => setShowCamera(false)} 
        onPhotoCaptured={(uri) => {
          setImageUrl(uri);
          setShowCamera(false);
        }} 
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Visits"
          subtitle={`${visits.length} total records`}
          actionLabel={showForm ? 'Cancel' : '+ New'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card variant="elevated" style={{ marginBottom: 24 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Log New Visit
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
                  style={[
                    s.chip,
                    {
                      backgroundColor: selectedCustomerId === c.id ? theme.colors.brand.primary : theme.colors.surface.input,
                      borderRadius: theme.borderRadius.md,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    typography.bodySm,
                    { color: selectedCustomerId === c.id ? '#FFFFFF' : theme.colors.text.primary, fontWeight: '600' },
                  ]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Products Discussed"
              value={productsDiscussed}
              onChangeText={setProductsDiscussed}
              placeholder="e.g. Product A, Product B"
            />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Visit notes..."
              multiline
              numberOfLines={3}
            />
            
            <View style={{ marginBottom: 20 }}>
              {imageUrl ? (
                <View style={s.photoPreview}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>📸 Photo Captured</Text>
                  <TouchableOpacity onPress={() => setImageUrl(null)}>
                    <Text style={{ color: theme.colors.semantic.error, fontWeight: 'bold' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowCamera(true)} style={[s.cameraButton, { backgroundColor: theme.colors.surface.input }]}>
                  <Text style={[typography.bodyMd, { color: theme.colors.brand.primary, fontWeight: '600' }]}>📷 Take Proof Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              label="Check In"
              onPress={handleSubmit}
              loading={createVisit.isPending}
              size="lg"
            />
          </Card>
        )}

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />
        )}
        {!isLoading && visits.length === 0 && (
          <EmptyState
            icon="📍"
            title="No Visits Yet"
            subtitle="Tap '+ New' to log your first customer visit."
          />
        )}
        {visits.map((v) => (
          <VisitCard key={v.id} visit={v} theme={theme} />
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
  cameraButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed'
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  }
});
