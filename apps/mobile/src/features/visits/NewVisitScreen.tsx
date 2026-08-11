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
  AppIcon,
  LoadingState,
} from '../../shared/components';
import { CameraCapture } from '../../shared/components/CameraCapture';
import { useCreateVisit } from './hooks/useVisits';
import { useCustomers } from '../customers/hooks/useCustomers';

interface Props {
  navigation: any;
}

export function NewVisitScreen({ navigation }: Props) {
  const theme = useTheme();

  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const createVisit = useCreateVisit();

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
        productsDiscussed: productsDiscussed.trim() || undefined,
        notes: notes.trim() || undefined,
        imageUrl: imageUrl || undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Visit logged successfully', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [selectedCustomerId, productsDiscussed, notes, imageUrl, createVisit, navigation]);

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
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Log New Visit</Text>
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

          {/* Visit Details */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              Visit Details
            </Text>
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
              placeholder="Any additional notes about the visit..."
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Proof Photo */}
          <Card style={{ marginBottom: 24 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Proof Photo
            </Text>
            {imageUrl ? (
              <View style={[styles.photoPreview, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="camera" color={theme.colors.semantic.success} size={18} />
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Photo Attached</Text>
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
                <AppIcon name="camera" color={theme.colors.brand.primary} size={20} />
                <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
                  Take Proof Photo
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          <Button
            label="Check In Visit"
            onPress={handleSubmit}
            loading={createVisit.isPending}
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
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
});
