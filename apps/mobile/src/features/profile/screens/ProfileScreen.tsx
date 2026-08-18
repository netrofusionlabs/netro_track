import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
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
  ProfessionalTimeline,
  AppIcon,
} from '../../../shared/components';
import { TermsModal } from '../../auth/components/TermsModal';
import { PrivacyModal } from '../../auth/components/PrivacyModal';
import { useProfile } from '../hooks/useProfile';
import { useUsers, useUserTimeline, useOrgChartRoots } from '../../employees/hooks/useUserManagement';
import { useCompanyDetail } from '../../companies/hooks/useCompanies';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';

import * as ImagePicker from 'react-native-image-picker';
import { profileService } from '../services/profile.service';
import { useQueryClient } from '@tanstack/react-query';

export function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  const consentState = useConsentStore();
  const { data: profile } = useProfile();
  const { data: timelineEvents = [] } = useUserTimeline(user?.id || '');
  const { data: orgChartData = [] } = useOrgChartRoots();
  const { data: company } = useCompanyDetail(user?.companyId);

  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter org chart for other members in company
  const companyOrgMembers = orgChartData.filter((u: any) => u.id !== user?.id);

  // Use live profile data when available
  const managerName = profile?.managerName ?? user?.managerName;
  const managerId = profile?.managerId ?? user?.managerId;
  const userDesignation = (user as any)?.designation?.name || (user as any)?.designationName || (profile as any)?.designation?.name || (profile as any)?.designationName || 'Team Member';
  const profilePictureUrl = (profile as any)?.profilePictureUrl ?? (user as any)?.profilePictureUrl;

  const formatRole = (role?: string) => {
    if (!role) return 'Employee';
    return ROLE_DISPLAY_LABELS[role as UserRole] || role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleUploadProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64 || !asset.type) {
        Alert.alert('Upload Error', 'Could not read image data.');
        return;
      }

      setIsUploading(true);

      // 1. Get pre-signed upload URL
      const { uploadUrl, fileId } = await profileService.getUploadUrl(asset.type);

      // 2. Upload directly to R2
      await profileService.uploadToR2(uploadUrl, asset.base64, asset.type);

      // 3. Notify backend of completion
      await profileService.completeUpload(fileId);

      // Refresh profile data to get the new picture URL
      await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Profile</Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]}>
          Account details & professional history
        </Text>

        {/* User Card */}
        <Card variant="elevated" style={styles.userCard}>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={user?.name} source={profilePictureUrl} size="lg" />
            <Button
              label={isUploading ? "Uploading..." : "Change Picture"}
              variant="ghost"
              size="sm"
              onPress={handleUploadProfilePicture}
              disabled={isUploading}
              style={{ marginTop: 8 }}
            />
          </View>
          <Text style={[typography.headingLg, { color: theme.colors.text.primary, marginTop: 12 }]}>
            {user?.name ?? 'User'}
          </Text>
          <Text style={[typography.bodyMd, { color: theme.colors.brand.primary, fontWeight: '700', marginTop: 4 }]}>
            💼 {userDesignation}
          </Text>
          <Badge
            label={`Role: ${formatRole(user?.role)}`}
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

            {!!user?.email && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Email Address</Text>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            )}

            {!!user?.phone && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Phone Number</Text>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  📱 {user.phone}
                </Text>
              </View>
            )}

            {!!(user?.emergencyContactPhone || user?.emergencyContactName) && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Emergency Contact</Text>
                <Text style={[typography.headingSm, { color: theme.colors.semantic.error, fontWeight: '700' }]}>
                  🆘 {user.emergencyContactName ? `${user.emergencyContactName} (` : ''}{user.emergencyContactPhone || ''}{user.emergencyContactName ? ')' : ''}
                </Text>
              </View>
            )}

            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Consent Status</Text>
              <StatusBadge
                status={consentState.hasAcceptedConsent ? 'active' : 'pending'}
                label={consentState.acceptedVersion ? `Accepted (v${consentState.acceptedVersion})` : 'Not Accepted'}
              />
            </View>

            {!!user?.bloodGroup && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Blood Group</Text>
                <Text style={[typography.headingSm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                  🩸 {user.bloodGroup}
                </Text>
              </View>
            )}

            {!!(managerId || managerName) && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.surface.divider }]}>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Reporting To</Text>
                <Text style={[typography.headingSm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                  {managerName ?? 'Supervisor'}
                </Text>
              </View>
            )}
          </Card>
        </Section>

        {/* Organization Hierarchy Link */}
        <Section title="Company & Organization">
          {user?.role === 'COMPANY_ADMIN' && company && (
            <Card
              onPress={() => (navigation as any).navigate('CompanyWizard', { companyId: user?.companyId })}
              style={{ padding: 14, marginBottom: 10 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={company.name} source={company.companyLogoUrl} size="md" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                    {company.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    Code: {company.code} · Manage Company Profile & Logo
                  </Text>
                </View>
                <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={18} />
              </View>
            </Card>
          )}

          <Card
            onPress={() => (navigation as any).navigate('OrgChart')}
            style={{ padding: 14 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <AppIcon name="employees" color={theme.colors.brand.primary} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  Interactive Organization Chart
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  View reporting hierarchy tree, team structure & direct reports
                </Text>
              </View>
              <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={18} />
            </View>
          </Card>
        </Section>

        {/* Professional Timeline */}
        <Section title={`Professional Timeline (${timelineEvents.length})`}>
          <ProfessionalTimeline events={timelineEvents} />
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
