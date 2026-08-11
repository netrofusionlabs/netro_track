import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity
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
  AppIcon,
  LoadingState,
} from '../../shared/components';
import { CameraCapture } from '../../shared/components/CameraCapture';
import { useInspections, useCreateInspection } from './hooks/useInspections';
import type { InspectionRecord } from './types';

function InspectionCard({ item }: { item: InspectionRecord }) {
  const theme = useTheme();
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="inspect" color={theme.colors.brand.primary} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {item.siteName}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.category && (
          <Badge label={item.category} variant="info" size="sm" />
        )}
      </View>
      <Text style={[typography.bodyMd, { color: theme.colors.text.primary, marginTop: 10 }]} numberOfLines={3}>
        {item.observation}
      </Text>
      {item.recommendation && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {item.recommendation}
          </Text>
        </View>
      )}
      {item.imageUrls?.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="camera" color={theme.colors.brand.primary} size={14} />
          <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
            {item.imageUrls.length} photo{item.imageUrls.length !== 1 ? 's' : ''} attached
          </Text>
        </View>
      )}
    </Card>
  );
}

export function InspectionsScreen() {
  const theme = useTheme();
  const { data: inspections = [], isLoading } = useInspections();
  const createInspection = useCreateInspection();

  const [showForm, setShowForm] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const handleSubmit = useCallback(() => {
    if (!siteName.trim()) { Alert.alert('Required', 'Site name is required'); return; }
    if (!observation.trim()) { Alert.alert('Required', 'Observation is required'); return; }

    createInspection.mutate(
      {
        siteName: siteName.trim(),
        category: category.trim() || undefined,
        latitude: 0,
        longitude: 0,
        observation: observation.trim(),
        recommendation: recommendation.trim() || undefined,
        imageUrls: imageUrls,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setSiteName('');
          setCategory('');
          setObservation('');
          setRecommendation('');
          setImageUrls([]);
          Alert.alert('Success', 'Inspection recorded');
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [siteName, category, observation, recommendation, imageUrls, createInspection]);

  if (showCamera) {
    return (
      <CameraCapture
        onCancel={() => setShowCamera(false)}
        onPhotoCaptured={(uri) => {
          setImageUrls(prev => [...prev, uri]);
          setShowCamera(false);
        }}
      />
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Inspections"
          subtitle={`${inspections.length} total records`}
          actionLabel={showForm ? 'Cancel' : '+ New'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              New Inspection
            </Text>
            <Input label="Site Name" value={siteName} onChangeText={setSiteName} placeholder="e.g. Warehouse B" />
            <Input label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Safety, Quality" />
            <Input label="Observation" value={observation} onChangeText={setObservation} placeholder="Describe what you found..." multiline numberOfLines={3} />
            <Input label="Recommendation" value={recommendation} onChangeText={setRecommendation} placeholder="Suggested actions..." multiline numberOfLines={2} />

            <View style={{ marginBottom: 16 }}>
              {imageUrls.length > 0 && (
                <View style={[styles.photoPreview, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="camera" color={theme.colors.brand.primary} size={18} />
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>
                      {imageUrls.length} Photo(s) Attached
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setImageUrls([])}>
                    <Text style={[typography.buttonSm, { color: theme.colors.semantic.error }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={() => setShowCamera(true)}
                style={[
                  styles.cameraButton,
                  {
                    backgroundColor: theme.colors.surface.subtle,
                    borderColor: theme.colors.surface.border,
                    marginTop: imageUrls.length > 0 ? 8 : 0,
                  },
                ]}
              >
                <AppIcon name="camera" color={theme.colors.brand.primary} size={18} />
                <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
                  Add Photo
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              label="Submit Inspection"
              onPress={handleSubmit}
              loading={createInspection.isPending}
              fullWidth
              size="md"
            />
          </Card>
        )}

        {isLoading && <LoadingState message="Loading inspection records..." />}

        {!isLoading && inspections.length === 0 && (
          <EmptyState
            icon="inspect"
            title="No Inspections Yet"
            subtitle="Tap '+ New' to record your first site inspection."
            actionLabel="Record Inspection"
            onAction={() => setShowForm(true)}
          />
        )}

        {inspections.map((item) => (
          <InspectionCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cameraButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
});
