import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Input,
  Button,
  AppIcon,
} from '../../shared/components';
import { CameraCapture } from '../../shared/components/CameraCapture';
import { useEffectiveAttendancePolicy, usePunchIn, usePunchOut } from './hooks/useAttendance';
import { getCurrentCoords } from '../../shared/services/trackingService';
import { api } from '../../shared/services/api';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../auth/stores/authStore';

export function PunchFormScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { punchType } = route.params;
  const userId = useAuthStore((s) => s.user?.id);

  const { data: policy, isLoading: loadingPolicy, error: policyError, refetch: refetchPolicy } = useEffectiveAttendancePolicy();
  const punchInMutation = usePunchIn();
  const punchOutMutation = usePunchOut();

  // Form states
  const [evidence, setEvidence] = useState<Record<string, any>>({});
  const [fileKeys, setFileKeys] = useState<Record<string, string>>({});
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Camera state
  const [activeCameraField, setActiveCameraField] = useState<string | null>(null);

  // Fetch current GPS coordinates
  const resolveLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentCoords();
      if (location) {
        setCoords({ latitude: location.latitude, longitude: location.longitude });
      } else {
        setCoords({ latitude: 0, longitude: 0 });
        Alert.alert('GPS Warning', 'Unable to fetch precise location. Coordinates will default to zero.');
      }
    } catch (err) {
      setCoords({ latitude: 0, longitude: 0 });
      console.warn('GPS location fetch error:', err);
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    setEvidence({});
    setFileKeys({});
    setCoords(null);
    void resolveLocation();
  }, [punchType, resolveLocation]);

  // Determine target configuration based on punch action type
  const config = policy ? (punchType === 'in' ? policy.punchInConfig : policy.punchOutConfig) : null;

  // Handle camera capture callbacks
  const handlePhotoCaptured = async (uri: string) => {
    const field = activeCameraField;
    setActiveCameraField(null);
    if (!field) return;

    const netInfoState = await NetInfo.fetch();
    const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

    if (!isOnline) {
      setEvidence((prev) => ({ ...prev, [field]: uri }));
      setFileKeys((prev) => ({ ...prev, [field]: `local_${Math.random().toString(36).substring(7)}` }));
      return;
    }

    setUploadingField(field);
    try {
      // 1. Request presigned upload URL
      const res = await api.post('/uploads/presigned-url', {
        purpose: 'attendance',
        contentType: 'image/jpeg',
        entityId: userId || 'anonymous',
      });
      const { uploadUrl, publicUrl, fileKey } = res.data.data;

      // 2. Resolve URI to a local Blob in React Native
      const localResponse = await fetch(uri);
      const blob = await localResponse.blob();

      // 3. Upload file to Cloudflare R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'image/jpeg');
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.send(blob);
      });

      // 4. Update evidence payload state
      setEvidence((prev) => ({ ...prev, [field]: publicUrl }));
      setFileKeys((prev) => ({ ...prev, [field]: fileKey }));
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'An error occurred during photo upload.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleRetake = async (fieldKey: string) => {
    const fileKey = fileKeys[fieldKey];
    if (fileKey) {
      try {
        await api.delete('/uploads/file', { data: { fileKey } });
        console.info(`[PunchFormScreen] Successfully deleted ${fileKey} from R2`);
      } catch (err) {
        console.warn(`[PunchFormScreen] Failed to delete old file ${fileKey}:`, err);
      }
    }
    setEvidence((prev) => ({ ...prev, [fieldKey]: null }));
    setFileKeys((prev) => ({ ...prev, [fieldKey]: '' }));
  };

  const handleTextChange = (field: string, text: string) => {
    setEvidence((prev) => ({ ...prev, [field]: text }));
  };

  const handleNumberChange = (field: string, text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setEvidence((prev) => ({ ...prev, [field]: cleaned ? parseFloat(cleaned) : '' }));
  };

  const handleSubmit = async () => {
    if (!config) return;

    // Validate mandatory standard fields
    const standardFields = [
      { key: 'selfie', label: 'Selfie Photo' },
      { key: 'vehicleMeter', label: 'Vehicle Meter Reading (number)' },
      { key: 'vehicleMeterPhoto', label: 'Vehicle Meter Photo' },
      { key: 'vehiclePhoto', label: 'Vehicle Photo' },
      { key: 'workSitePhoto', label: 'Work Site Photo' },
      { key: 'customerLocation', label: 'Customer Location' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'signature', label: 'Signature' },
    ];

    // vehicleMeterPhoto inherits REQUIRED status from vehicleMeter
    const vehicleMeterStatus = config.vehicleMeter;
    if (vehicleMeterStatus === 'REQUIRED') {
      if (!evidence.vehicleMeterPhoto) {
        Alert.alert('Required Field', 'A photo of the Vehicle Meter is required by your attendance policy.');
        return;
      }
    }

    for (const field of standardFields) {
      if (config[field.key] === 'REQUIRED') {
        const value = evidence[field.key];
        if (value === undefined || value === null || value === '') {
          Alert.alert('Required Field', `${field.label} is required by your attendance policy.`);
          return;
        }
      }
    }

    // Validate GPS location if required by policy
    if (config.gps === 'REQUIRED' && (!coords || (coords.latitude === 0 && coords.longitude === 0))) {
      Alert.alert('GPS Location Required', 'Please enable location permissions and capture a valid GPS position.');
      return;
    }

    // Validate custom fields
    const customFields = config.customFields || [];
    for (const cf of customFields) {
      if (cf.status === 'REQUIRED') {
        const value = evidence[cf.key];
        if (value === undefined || value === null || value === '') {
          Alert.alert('Required Field', `"${cf.label}" is required by your attendance policy.`);
          return;
        }
      }
    }

    const payload = {
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
      evidence,
    };

    const mutation = punchType === 'in' ? punchInMutation : punchOutMutation;

    mutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert(
          'Success',
          `Shift Punch ${punchType.toUpperCase()} recorded successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      },
      onError: (err) => {
        Alert.alert('Punch Failed', err.message || 'An error occurred during submission.');
      },
    });
  };

  if (activeCameraField) {
    return (
      <CameraCapture
        onCancel={() => setActiveCameraField(null)}
        onPhotoCaptured={handlePhotoCaptured}
      />
    );
  }

  if (loadingPolicy) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 12 }]}>
          Resolving effective attendance policy...
        </Text>
      </View>
    );
  }

  if (policyError || !config) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background, paddingHorizontal: 24 }]}>
        <AppIcon name="alert" color={theme.colors.semantic.error} size={48} />
        <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, textAlign: 'center' }]}>
          Failed to resolve attendance policy
        </Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8, textAlign: 'center' }]}>
          {policyError?.message || 'Check your internet connection and try again.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Button label="Go Back" variant="outline" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
          <Button label="Retry" onPress={() => { void refetchPolicy(); }} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  // Helper to render camera preview card
  const renderPhotoSelector = (fieldKey: string, fieldLabel: string) => {
    const isRequired = config[fieldKey] === 'REQUIRED';
    const status = config[fieldKey];
    if (status === 'DISABLED') return null;

    const uploadedUrl = evidence[fieldKey];
    const isUploading = uploadingField === fieldKey;

    return (
      <Card style={{ marginBottom: 16 }} key={fieldKey}>
        <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 8 }]}>
          {fieldLabel} {isRequired && '*'}
        </Text>
        {isUploading ? (
          <View style={styles.uploadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand.primary} />
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8 }]}>
              Uploading to secure storage...
            </Text>
          </View>
        ) : uploadedUrl ? (
          <View>
            <View style={[styles.uploadedBox, { borderColor: theme.colors.semantic.success }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="success" color={theme.colors.semantic.success} size={18} />
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  Photo Captured
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRetake(fieldKey)}>
                <Text style={[typography.buttonSm, { color: theme.colors.semantic.error }]}>Retake</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: uploadedUrl }}
              style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 8 }}
              resizeMode="cover"
            />
            <Text selectable numberOfLines={1} style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 6, fontSize: 10 }]}>
              R2 URL: {uploadedUrl}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.captureBtn, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle }]}
            onPress={() => setActiveCameraField(fieldKey)}
          >
            <AppIcon name="camera" color={theme.colors.brand.primary} size={20} />
            <Text style={[typography.buttonSm, { color: theme.colors.brand.primary, marginLeft: 8 }]}>
              Take {fieldLabel}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
          Record Punch {punchType === 'in' ? 'In' : 'Out'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Policy Information notice */}
          <View style={[styles.infoBanner, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <AppIcon name="attendance" color={theme.colors.brand.primary} size={16} />
            <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 8, flex: 1, fontWeight: '600' }]}>
              Applying: {policy?.policyName}
            </Text>
          </View>

          {/* Location Status Card */}
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>GPS Location</Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {loadingLocation 
                    ? 'Fetching current coordinates...' 
                    : coords 
                    ? `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}` 
                    : 'Location not resolved'}
                </Text>
              </View>
              {loadingLocation ? (
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
              ) : (
                <TouchableOpacity onPress={resolveLocation} style={styles.refreshLocBtn}>
                  <AppIcon name="teamMap" color={theme.colors.brand.primary} size={18} />
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Render photo configurations */}
          {renderPhotoSelector('selfie', 'Selfie Photo')}
          {renderPhotoSelector('vehiclePhoto', 'Vehicle Photo')}
          {renderPhotoSelector('workSitePhoto', 'Work Site Photo')}

          {/* Text/Number dynamic form cards */}
          {(config.vehicleMeter !== 'DISABLED' || config.remarks !== 'DISABLED' || config.signature !== 'DISABLED' || (config.customFields && config.customFields.length > 0)) && (
            <Card style={{ marginBottom: 24 }}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 14 }]}>
                Punch Evidence details
              </Text>

              {/* Vehicle Meter — number input + mandatory photo */}
              {config.vehicleMeter !== 'DISABLED' && (() => {
                const isRequired = config.vehicleMeter === 'REQUIRED';
                const photoKey = 'vehicleMeterPhoto';
                const uploadedMeterPhoto = evidence[photoKey];
                const isMeterPhotoUploading = uploadingField === photoKey;
                return (
                  <View>
                    <Input
                      label={`Vehicle Meter Reading ${isRequired ? '*' : ''}`}
                      value={evidence.vehicleMeter?.toString() || ''}
                      onChangeText={(val) => handleNumberChange('vehicleMeter', val)}
                      placeholder="Enter current odometer / meter reading"
                      keyboardType="numeric"
                    />
                    {/* Meter photo capture */}
                    <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 8, marginTop: 12 }]}>
                      Meter Reading Photo {isRequired && '*'}
                    </Text>
                    {isMeterPhotoUploading ? (
                      <View style={styles.uploadingBox}>
                        <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                        <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8 }]}>
                          Uploading meter photo...
                        </Text>
                      </View>
                    ) : uploadedMeterPhoto ? (
                      <View>
                        <View style={[styles.uploadedBox, { borderColor: theme.colors.semantic.success }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <AppIcon name="success" color={theme.colors.semantic.success} size={18} />
                            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                              Meter Photo Captured
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleRetake(photoKey)}>
                            <Text style={[typography.buttonSm, { color: theme.colors.semantic.error }]}>Retake</Text>
                          </TouchableOpacity>
                        </View>
                        <Image
                          source={{ uri: uploadedMeterPhoto }}
                          style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 8 }}
                          resizeMode="cover"
                        />
                        <Text selectable numberOfLines={1} style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 6, fontSize: 10 }]}>
                          R2 URL: {uploadedMeterPhoto}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.captureBtn, { borderColor: theme.colors.surface.border, backgroundColor: theme.colors.surface.subtle }]}
                        onPress={() => setActiveCameraField(photoKey)}
                      >
                        <AppIcon name="camera" color={theme.colors.brand.primary} size={20} />
                        <Text style={[typography.buttonSm, { color: theme.colors.brand.primary, marginLeft: 8 }]}>
                          Take Meter Photo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

              {/* Customer Location */}
              {config.customerLocation !== 'DISABLED' && (
                <Input
                  label={`Customer Location / Name ${config.customerLocation === 'REQUIRED' ? '*' : ''}`}
                  value={evidence.customerLocation || ''}
                  onChangeText={(val) => handleTextChange('customerLocation', val)}
                  placeholder="e.g. Infobell Office or Client Site A"
                />
              )}

              {/* Remarks */}
              {config.remarks !== 'DISABLED' && (
                <Input
                  label={`Remarks ${config.remarks === 'REQUIRED' ? '*' : ''}`}
                  value={evidence.remarks || ''}
                  onChangeText={(val) => handleTextChange('remarks', val)}
                  placeholder="Enter remarks or notes"
                  multiline
                  numberOfLines={3}
                />
              )}

              {/* Signature (rendered as text for simplicity, extensible to drawing) */}
              {config.signature !== 'DISABLED' && (
                <Input
                  label={`Signature Token ${config.signature === 'REQUIRED' ? '*' : ''}`}
                  value={evidence.signature || ''}
                  onChangeText={(val) => handleTextChange('signature', val)}
                  placeholder="Type your name to digitally sign"
                />
              )}

              {/* Custom fields */}
              {(config.customFields || []).map((cf: any) => {
                const isRequired = cf.status === 'REQUIRED';
                if (cf.status === 'DISABLED') return null;

                return (
                  <Input
                    key={cf.key}
                    label={`${cf.label} ${isRequired ? '*' : ''}`}
                    value={evidence[cf.key]?.toString() || ''}
                    onChangeText={(val) => cf.type === 'NUMBER' ? handleNumberChange(cf.key, val) : handleTextChange(cf.key, val)}
                    placeholder={`Enter ${cf.label.toLowerCase()}`}
                    keyboardType={cf.type === 'NUMBER' ? 'numeric' : 'default'}
                  />
                );
              })}
            </Card>
          )}

          {/* Action button */}
          <Button
            label={punchType === 'in' ? 'Submit Punch In' : 'Submit Punch Out'}
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={punchInMutation.isPending || punchOutMutation.isPending || uploadingField !== null}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  refreshLocBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'center',
  },
  uploadedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
});
