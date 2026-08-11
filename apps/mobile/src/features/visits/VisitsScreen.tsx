import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  StatusBadge,
  EmptyState,
  ScreenHeader,
  Input,
  Button,
  AppIcon,
  Section,
  LoadingState,
} from '../../shared/components';
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

function VisitCard({ visit }: { visit: VisitRecord }) {
  const theme = useTheme();
  const complete = !!visit.checkOutTime;

  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="visits" color={theme.colors.brand.primary} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {visit.customer?.name ?? 'Unknown Customer'}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {formatDate(visit.checkInTime)} · {formatTime(visit.checkInTime)} → {formatTime(visit.checkOutTime)}
          </Text>
        </View>
        <StatusBadge
          status={complete ? 'completed' : 'active'}
          label={complete ? 'Complete' : 'Active'}
        />
      </View>

      {visit.productsDiscussed && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="products" color={theme.colors.text.secondary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]} numberOfLines={2}>
            {visit.productsDiscussed}
          </Text>
        </View>
      )}

      {visit.notes && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {visit.notes}
          </Text>
        </View>
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
  }, [selectedCustomerId, productsDiscussed, notes, imageUrl, createVisit]);

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
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Visits"
          subtitle={`${visits.length} total records`}
          actionLabel={showForm ? 'Cancel' : '+ New'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              Log New Visit
            </Text>

            <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
              Select Customer
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
                  <Text
                    style={[
                      typography.bodySm,
                      {
                        color: selectedCustomerId === c.id ? theme.colors.text.inverse : theme.colors.text.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
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

            <View style={{ marginBottom: 16 }}>
              {imageUrl ? (
                <View style={[styles.photoPreview, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="camera" color={theme.colors.semantic.success} size={18} />
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Proof Photo Attached</Text>
                  </View>
                  <TouchableOpacity onPress={() => setImageUrl(null)}>
                    <Text style={[typography.buttonSm, { color: theme.colors.semantic.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowCamera(true)}
                  style={[styles.cameraButton, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}
                >
                  <AppIcon name="camera" color={theme.colors.brand.primary} size={18} />
                  <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
                    Take Proof Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              label="Check In Visit"
              onPress={handleSubmit}
              loading={createVisit.isPending}
              fullWidth
              size="md"
            />
          </Card>
        )}

        {isLoading && <LoadingState message="Loading visits..." />}

        {!isLoading && visits.length === 0 && (
          <EmptyState
            icon="visits"
            title="No Visits Recorded"
            subtitle="Log your first customer visit to keep your activity updated."
            actionLabel="Log Visit"
            onAction={() => setShowForm(true)}
          />
        )}

        {visits.map((v) => (
          <VisitCard key={v.id} visit={v} />
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
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
});
