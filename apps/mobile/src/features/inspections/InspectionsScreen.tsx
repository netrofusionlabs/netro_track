import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator
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
import { useInspections, useCreateInspection } from './hooks/useInspections';
import type { InspectionRecord } from './types';

function InspectionCard({ item, theme }: { item: InspectionRecord; theme: ReturnType<typeof useTheme> }) {
  return (
    <Card style={{ paddingVertical: 16, paddingHorizontal: 18 }}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
            {item.siteName}
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.category && (
          <Badge label={item.category} size="sm" />
        )}
      </View>
      <Text style={[typography.bodyMd, { color: theme.colors.text.primary, marginTop: 12 }]} numberOfLines={3}>
        {item.observation}
      </Text>
      {item.recommendation && (
        <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 8 }]} numberOfLines={2}>
          💡 {item.recommendation}
        </Text>
      )}
      {item.imageUrls?.length > 0 && (
        <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 8 }]}>
          📷 {item.imageUrls.length} photo{item.imageUrls.length !== 1 ? 's' : ''} attached
        </Text>
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
  }, [siteName, category, observation, recommendation, createInspection]);

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
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Inspections"
          subtitle={`${inspections.length} total records`}
          actionLabel={showForm ? 'Cancel' : '+ New'}
          onAction={() => setShowForm(!showForm)}
        />

        {showForm && (
          <Card variant="elevated" style={{ marginBottom: 24 }}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              New Inspection
            </Text>
            <Input label="Site Name" value={siteName} onChangeText={setSiteName} placeholder="e.g. Warehouse B" />
            <Input label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Safety, Quality" />
            <Input label="Observation" value={observation} onChangeText={setObservation} placeholder="Describe what you found..." multiline numberOfLines={4} />
            <Input label="Recommendation" value={recommendation} onChangeText={setRecommendation} placeholder="Suggested actions..." multiline numberOfLines={3} />
            
            <View style={{ marginBottom: 20 }}>
              {imageUrls.length > 0 && (
                <View style={s.photoPreview}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>📸 {imageUrls.length} Photo(s) Attached</Text>
                  <TouchableOpacity onPress={() => setImageUrls([])}>
                    <Text style={{ color: theme.colors.semantic.error, fontWeight: 'bold' }}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={() => setShowCamera(true)} style={[s.cameraButton, { backgroundColor: theme.colors.surface.input, marginTop: imageUrls.length > 0 ? 10 : 0 }]}>
                <Text style={[typography.bodyMd, { color: theme.colors.brand.primary, fontWeight: '600' }]}>📷 Add Photo</Text>
              </TouchableOpacity>
            </View>

            <Button label="Submit Inspection" onPress={handleSubmit} loading={createInspection.isPending} size="lg" />
          </Card>
        )}

        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand.primary} size="large" />}
        {!isLoading && inspections.length === 0 && (
          <EmptyState icon="🔍" title="No Inspections Yet" subtitle="Tap '+ New' to record your first inspection." />
        )}
        {inspections.map((item) => (
          <InspectionCard key={item.id} item={item} theme={theme} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
