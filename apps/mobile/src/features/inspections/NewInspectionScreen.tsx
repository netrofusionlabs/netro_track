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
} from '../../shared/components';
import { CameraCapture } from '../../shared/components/CameraCapture';
import { useCreateInspection } from './hooks/useInspections';

const CATEGORIES = ['Safety', 'Quality', 'Compliance', 'Maintenance', 'Environment', 'Other'];

interface Props {
  navigation: any;
}

export function NewInspectionScreen({ navigation }: Props) {
  const theme = useTheme();
  const createInspection = useCreateInspection();

  const [siteName, setSiteName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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
        category: selectedCategory || undefined,
        latitude: 0,
        longitude: 0,
        observation: observation.trim(),
        recommendation: recommendation.trim() || undefined,
        imageUrls,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Inspection submitted', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }, [siteName, selectedCategory, observation, recommendation, imageUrls, createInspection, navigation]);

  if (showCamera) {
    return (
      <CameraCapture
        onCancel={() => setShowCamera(false)}
        onPhotoCaptured={(uri) => {
          setImageUrls((prev) => [...prev, uri]);
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
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>New Inspection</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Site Info */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              Site Information
            </Text>
            <Input
              label="Site Name *"
              value={siteName}
              onChangeText={setSiteName}
              placeholder="e.g. Warehouse B, Factory Floor 3"
            />

            <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 8 }]}>
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCategory === cat ? theme.colors.brand.primary : theme.colors.surface.subtle,
                      borderColor: selectedCategory === cat ? theme.colors.brand.primary : theme.colors.surface.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodySm, {
                    color: selectedCategory === cat ? theme.colors.text.inverse : theme.colors.text.primary,
                    fontWeight: '600',
                  }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>

          {/* Findings */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 14 }]}>
              Findings
            </Text>
            <Input
              label="Observation *"
              value={observation}
              onChangeText={setObservation}
              placeholder="Describe what you found at the site..."
              multiline
              numberOfLines={4}
            />
            <Input
              label="Recommendation"
              value={recommendation}
              onChangeText={setRecommendation}
              placeholder="Suggested corrective actions..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Photos */}
          <Card style={{ marginBottom: 24 }}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Site Photos
            </Text>

            {imageUrls.length > 0 && (
              <View style={[styles.photoPreview, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="camera" color={theme.colors.brand.primary} size={18} />
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>
                    {imageUrls.length} Photo{imageUrls.length !== 1 ? 's' : ''} Attached
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setImageUrls([])}>
                  <Text style={[typography.buttonSm, { color: theme.colors.semantic.error }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowCamera(true)}
              style={[styles.cameraButton, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}
            >
              <AppIcon name="camera" color={theme.colors.brand.primary} size={20} />
              <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
                {imageUrls.length > 0 ? 'Add Another Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </Card>

          <Button
            label="Submit Inspection"
            onPress={handleSubmit}
            loading={createInspection.isPending}
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
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 8,
  },
});
