import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import {
  Card,
  Button,
  Divider,
  Badge,
  AppIcon,
  BrandLogo,
} from '../../../shared/components';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';
import {
  useConsentStore,
  CURRENT_CONSENT_VERSION,
} from '../../../shared/stores/consentStore';
import {
  checkAllPermissions,
  requestLocationPermissionsFlow,
  requestNotificationPermissionFlow,
  openAppSettings,
  PermissionStatusResult,
} from '../../../shared/utils/permissionHandler';

interface ConsentScreenProps {
  onConsentAccepted?: () => void;
}

export function ConsentScreen({ onConsentAccepted }: ConsentScreenProps) {
  const theme = useTheme();
  const acceptConsent = useConsentStore((state) => state.acceptConsent);

  // Modal visibilities
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  // Consent checkbox
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permission states
  const [permissionState, setPermissionState] = useState<PermissionStatusResult>({
    locationGranted: false,
    backgroundLocationGranted: false,
    notificationGranted: false,
    canRequestLocation: true,
    canRequestNotification: true,
  });

  const updatePermissions = useCallback(async () => {
    const status = await checkAllPermissions();
    setPermissionState(status);
  }, []);

  useEffect(() => {
    void updatePermissions();
  }, [updatePermissions]);

  const handleGrantLocation = async () => {
    await requestLocationPermissionsFlow();
    await updatePermissions();
  };

  const handleGrantNotification = async () => {
    await requestNotificationPermissionFlow();
    await updatePermissions();
  };

  const handleAcceptAndContinue = async () => {
    if (!isChecked) return;
    setIsSubmitting(true);

    try {
      if (!permissionState.locationGranted) {
        await requestLocationPermissionsFlow();
      }
      if (!permissionState.notificationGranted) {
        await requestNotificationPermissionFlow();
      }

      await updatePermissions();
      acceptConsent(CURRENT_CONSENT_VERSION);

      if (onConsentAccepted) {
        onConsentAccepted();
      }
    } catch (err) {
      console.warn('[ConsentScreen] Acceptance error:', err);
      Alert.alert('Notice', 'An error occurred saving consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <BrandLogo variant="banner" size={240} style={styles.brandLogo} />
          <Badge
            label={`Version ${CURRENT_CONSENT_VERSION}`}
            variant="info"
            size="sm"
          />
          <Text style={[typography.displaySm, { color: theme.colors.text.primary, marginTop: 8 }]}>
            Attendance & Privacy Information
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            Please review and acknowledge our Terms, Privacy Policy, and Operational Rules before proceeding.
          </Text>
        </View>

        {/* 1. Terms & Conditions Card */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="document" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Terms & Conditions
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Service agreement & usage rules
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8 }]}>
            By using NetroTrack, you agree to our standard field workforce management terms, attendance policies, and service obligations.
          </Text>
          <Button
            label="Read Full Terms & Conditions"
            onPress={() => setTermsVisible(true)}
            variant="outline"
            size="sm"
            style={styles.cardButton}
          />
        </Card>

        {/* 2. Privacy Policy Card */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="lock" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Privacy Policy
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Data protection & security details
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8 }]}>
            Your privacy is protected. Location data is monitored strictly during active working shifts between Punch In and Punch Out. We never sell your data.
          </Text>
          <Button
            label="Read Full Privacy Policy"
            onPress={() => setPrivacyVisible(true)}
            variant="outline"
            size="sm"
            style={styles.cardButton}
          />
        </Card>

        {/* 3. GPS & Location Tracking */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="visits" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                GPS & Location Tracking
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Work location recording
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8, lineHeight: 20 }]}>
            Location access is required to record your work location and maintain accurate GPS-based attendance during active shift hours. Tracking automatically pauses when you Punch Out.
          </Text>
        </Card>

        {/* 4. Punch In / Punch Out Mandatory */}
        <Card variant="elevated" style={{ ...styles.card, borderWidth: 1, borderColor: theme.colors.brand.primary }}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="attendance" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Mandatory Punch In / Punch Out
              </Text>
              <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                Important Requirement
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600', marginTop: 8 }]}>
            Punch In and Punch Out are mandatory for attendance tracking.
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, lineHeight: 20 }]}>
            • Must Punch In when starting work.{'\n'}
            • Must Punch Out when ending work.{'\n'}
            • GPS tracking is associated with the active shift.{'\n'}
            • Do not force-close or kill the app while punched in.
          </Text>
        </Card>

        {/* 5. Internet Connection */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="building" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Internet Connection
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Connectivity & offline buffer
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600', marginTop: 8 }]}>
            Make sure your mobile internet/Wi-Fi is turned ON and connected while working for better attendance accuracy and timely GPS synchronization.
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, lineHeight: 20 }]}>
            • A stable internet connection is strongly recommended.{'\n'}
            • If internet is temporarily lost, GPS data is saved locally on your device.{'\n'}
            • Data synchronizes automatically once connectivity returns.{'\n'}
            • Avoid turning off mobile data/Wi-Fi while punched in.
          </Text>
        </Card>

        {/* 6. Notifications */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
              <AppIcon name="bell" color={theme.colors.brand.primary} size={20} />
            </View>
            <View style={styles.cardHeaderTextContainer}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Notification Access
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Shift updates & tracking notifications
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600', marginTop: 8 }]}>
            Notification permission is required so the app can provide important attendance and GPS tracking updates.
          </Text>
        </Card>

        {/* 7. Required Permissions Status Card */}
        <Card variant="elevated" style={styles.card}>
          <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
            Required Permissions Status
          </Text>
          <Divider style={styles.divider} />

          {/* Location status row */}
          <View style={styles.permRow}>
            <View style={styles.permTextGroup}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                Location Access
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Foreground & background GPS tracking
              </Text>
            </View>
            <Badge
              label={permissionState.locationGranted ? 'Granted' : 'Pending'}
              variant={permissionState.locationGranted ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {!permissionState.locationGranted && (
            <View style={styles.permActionRow}>
              <Button
                label="Grant Location"
                onPress={handleGrantLocation}
                variant="outline"
                size="sm"
              />
              <Button
                label="Open Settings"
                onPress={openAppSettings}
                variant="ghost"
                size="sm"
              />
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Notification status row */}
          <View style={styles.permRow}>
            <View style={styles.permTextGroup}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                Notifications Access
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Shift status & tracking updates
              </Text>
            </View>
            <Badge
              label={permissionState.notificationGranted ? 'Granted' : 'Pending'}
              variant={permissionState.notificationGranted ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {!permissionState.notificationGranted && (
            <View style={styles.permActionRow}>
              <Button
                label="Grant Notifications"
                onPress={handleGrantNotification}
                variant="outline"
                size="sm"
              />
              <Button
                label="Open Settings"
                onPress={openAppSettings}
                variant="ghost"
                size="sm"
              />
            </View>
          )}
        </Card>

        {/* Acknowledgement Checkbox */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsChecked((prev) => !prev)}
          style={[
            styles.checkboxContainer,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: isChecked ? theme.colors.brand.primary : theme.colors.surface.border,
            },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isChecked ? theme.colors.brand.primary : theme.colors.text.tertiary,
                backgroundColor: isChecked ? theme.colors.brand.primary : 'transparent',
              },
            ]}
          >
            {isChecked && <AppIcon name="check" color={theme.colors.text.inverse} size={14} />}
          </View>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1, lineHeight: 20 }]}>
            I have read and understood the Terms & Conditions and Privacy Policy, and I understand the attendance, GPS tracking, notification, and connectivity requirements.
          </Text>
        </TouchableOpacity>

        {/* Accept & Continue Button */}
        <Button
          label="Accept & Continue"
          onPress={handleAcceptAndContinue}
          disabled={!isChecked || isSubmitting}
          loading={isSubmitting}
          fullWidth
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>

      {/* Full Terms & Privacy Modals */}
      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 16,
  },
  brandLogo: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  card: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextContainer: {
    flex: 1,
  },
  cardButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  permActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  submitButton: {
    width: '100%',
  },
});
