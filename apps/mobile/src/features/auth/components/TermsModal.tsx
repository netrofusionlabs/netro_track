import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button } from '../../../shared/components/Button';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsModal({ visible, onClose }: TermsModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.surface.input }]}>
          <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>Terms & Conditions</Text>
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
            NetroTrack Service Policy v1.0
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={true}>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginBottom: 16 }]}>
            Last updated: August 2026
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 12, marginBottom: 6 }]}>
            1. Acceptance of Terms
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            By creating an account or accessing the NetroTrack Field Workforce Management application, you agree to comply with and be bound by these Terms & Conditions. NetroTrack is an enterprise field workforce management tool provided to your employer/organization.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            2. Mandatory Attendance & Punch In / Out
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            • Employees are required to Punch In at the start of their working shift and Punch Out at the end of their shift.{'\n'}
            • Attendance tracking, GPS coordinates, and visit records are associated with your active working session.{'\n'}
            • You must not force-close or terminate the application process while punched in, as doing so may prevent proper attendance logging and GPS sync.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            3. GPS & Location Tracking Requirements
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            • Location access (including background location) is mandatory during active working hours for shift validation, route logging, and distance verification.{'\n'}
            • GPS tracking is active ONLY while you are Punched In. Once you Punch Out, location tracking is automatically deactivated.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            4. Internet Connectivity & Sync
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            • Users must maintain an active mobile internet or Wi-Fi connection while working to ensure timely GPS synchronization and accurate status reporting.{'\n'}
            • In cases of temporary network unavailability, attendance and location data will be buffered securely on your device and automatically uploaded once connectivity is restored.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            5. User Conduct & Integrity
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20 }]}>
            You agree not to use GPS spoofing software, mock location applications, unauthorized device modifications, or fraudulent attendance reporting. Any attempt to tamper with GPS hardware or location reports is monitored and logged.
          </Text>

          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 6 }]}>
            6. Changes to Terms
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, lineHeight: 20, marginBottom: 24 }]}>
            NetroFusion Labs reserves the right to modify these Terms. Continued use of NetroTrack following notice of updated terms constitutes acceptance of the modified Terms & Conditions.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.surface.input }]}>
          <Button label="Close Terms & Conditions" onPress={onClose} variant="primary" size="md" />
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
