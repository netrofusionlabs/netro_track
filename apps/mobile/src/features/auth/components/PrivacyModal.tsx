import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button } from '../../../shared/components/Button';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.surface.input }]}>
          <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>Privacy Policy</Text>
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
            NetroTrack Data Protection Statement v1.0
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={true}>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginBottom: 16 }]}>
            Last updated: August 2026
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 12, marginBottom: 6 }]}>
            1. Information We Collect
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            NetroTrack collects only essential data needed to provide field workforce tracking services to your organization:{'\n'}
            • **Location Data**: Precise (GPS) and coarse location coordinates collected during active shift hours.{'\n'}
            • **Attendance Records**: Punch-in and punch-out timestamps, shift duration, and visit completions.{'\n'}
            • **Device Metadata**: Battery state, network status, app version, and device OS version for diagnostic sync.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            2. When Location Data Is Collected
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            • **Active Shift Only**: Location monitoring is strictly limited to your working hours between Punch In and Punch Out.{'\n'}
            • **Zero Off-Duty Tracking**: When you Punch Out, all GPS tracking is immediately suspended. We do NOT track your location outside working hours or off-duty periods.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            3. How We Use Your Data
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            Your data is used solely for:{'\n'}
            • Verifying attendance and work locations for payroll and operational management.{'\n'}
            • Generating shift movement trails and distance calculations for your employer.{'\n'}
            • Ensuring field staff safety and emergency support during field visits.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            4. Data Storage & Security
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            • All data transmitted between your device and our servers is encrypted using TLS 1.3/HTTPS.{'\n'}
            • Data is stored in secure PostgreSQL database infrastructure (Neon) and Cloudflare R2 object storage with multi-tenant company isolation (`companyId`).{'\n'}
            • Local buffer data on your mobile device is encrypted via hardware-level MMKV storage.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            5. No Third-Party Selling
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20, marginBottom: 24 }]}>
            NetroTrack does NOT sell, rent, or trade your personal location data or identity to advertisers or third-party marketing companies. Data is processed strictly for enterprise SaaS workforce management.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.surface.input }]}>
          <Button label="Close Privacy Policy" onPress={onClose} variant="primary" size="md" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
