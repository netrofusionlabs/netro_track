import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { useAuthStore } from '../../auth/stores/authStore';
import { useConsentStore } from '../../../shared/stores/consentStore';
import {
  Card,
  Badge,
  Avatar,
  Section,
  ListItem,
  Button,
  StatusBadge,
  BrandLogo,
} from '../../../shared/components';
import { TermsModal } from '../../auth/components/TermsModal';
import { PrivacyModal } from '../../auth/components/PrivacyModal';

export function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  const consentState = useConsentStore();

  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const formatRole = (role?: string) => {
    if (!role) return 'Employee';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Profile</Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
          Account details & system settings
        </Text>

        {/* User Card */}
        <Card variant="elevated" style={styles.userCard}>
          <Avatar name={user?.name} size="lg" />
          <Text style={[typography.headingLg, { color: theme.colors.text.primary, marginTop: 12 }]}>
            {user?.name ?? 'User'}
          </Text>
          <Badge
            label={formatRole(user?.role)}
            variant="info"
            size="md"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Account Details Section */}
        <Section title="Account Information">
          <Card noPadding>
            <View style={styles.infoRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Employee ID</Text>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {user?.employeeId ?? '—'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>User ID</Text>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {user?.id ?? '—'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Consent Status</Text>
              <StatusBadge
                status={consentState.hasAcceptedConsent ? 'active' : 'pending'}
                label={consentState.acceptedVersion ? `Accepted (v${consentState.acceptedVersion})` : 'Not Accepted'}
              />
            </View>
          </Card>
        </Section>

        {/* Legal Section */}
        <Section title="Legal & Privacy">
          <ListItem
            icon="document"
            title="Terms & Conditions"
            subtitle="Service agreement and usage rules"
            showChevron
            onPress={() => setTermsVisible(true)}
          />
          <ListItem
            icon="lock"
            title="Privacy Policy"
            subtitle="Data protection and privacy policy"
            showChevron
            onPress={() => setPrivacyVisible(false)}
          />
        </Section>

        {/* Logout CTA */}
        <Button
          label="Log Out"
          onPress={clearCredentials}
          variant="danger"
          size="lg"
          icon="logout"
          fullWidth
          style={{ marginTop: 24 }}
        />

        <View style={styles.aboutBrand}>
          <BrandLogo variant="banner" size={200} />
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, marginTop: 8, textAlign: 'center' }]}>
            Track. Manage. Perform. · Powered by NetroFusion Labs
          </Text>
        </View>
      </ScrollView>

      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutBrand: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 8,
  },
});
