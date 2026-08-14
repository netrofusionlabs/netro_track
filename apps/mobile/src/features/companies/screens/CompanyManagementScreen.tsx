import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import {
  ScreenHeader,
  Card,
  SearchInput,
  LoadingState,
  EmptyState,
  Badge,
  AppIcon,
  Button,
  Avatar,
} from '../../../shared/components';
import { useCompanies, useDeleteCompany } from '../hooks/useCompanies';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import * as ImagePicker from 'react-native-image-picker';
import { companyService } from '../services/companyService';

export function CompanyManagementScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { data: companies = [], isLoading, refetch } = useCompanies();
  const deleteCompanyMutation = useDeleteCompany();

  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingCompanyId, setUploadingCompanyId] = useState<string | null>(null);

  useRefreshOnFocus(refetch);

  const handleUploadLogo = async (companyId: string) => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri || !asset.type) return;

      setUploadingCompanyId(companyId);

      const { uploadUrl, fileId } = await companyService.getLogoUploadUrl(companyId, asset.type);
      await companyService.uploadToR2(uploadUrl, asset.uri, asset.type);
      await companyService.completeLogoUpload(companyId, fileId);

      refetch();
    } catch (error) {
      console.error('Failed to upload company logo:', error);
      Alert.alert('Upload Failed', 'There was an issue uploading the logo. Please try again.');
    } finally {
      setUploadingCompanyId(null);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const handleDelete = (id: string, name: string) => {
    const targetCompany = companies.find((c) => c.id === id);
    if (targetCompany?.code?.toUpperCase() === 'NETRO' || targetCompany?.name?.toLowerCase() === 'netrotrack') {
      Alert.alert('Action Forbidden', 'The master platform company (NetroTrack) cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Company',
      `Are you sure you want to soft delete ${name}? All associated accounts will be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCompanyMutation.mutateAsync(id);
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete company.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Company Management"
          subtitle={`${companies.length} active tenant companies registered in system`}
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.searchRow}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by company name or code..."
          />
        </View>

        {isLoading ? (
          <LoadingState message="Loading tenant companies..." />
        ) : filteredCompanies.length === 0 ? (
          <EmptyState
            icon="document"
            title="No Companies Found"
            subtitle="Register a new company using the Add Company button."
          />
        ) : (
          filteredCompanies.map((c) => {
            const isMasterCompany = c.code?.toUpperCase() === 'NETRO' || c.name?.toLowerCase() === 'netrotrack';
            return (
              <Card key={c.id} variant="outlined" style={styles.companyCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Avatar name={c.name} source={c.companyLogoUrl} size="lg" />
                    <Button
                      label={uploadingCompanyId === c.id ? "..." : "Logo"}
                      variant="ghost"
                      size="sm"
                      onPress={() => handleUploadLogo(c.id)}
                      disabled={uploadingCompanyId === c.id}
                      style={{ marginTop: 4, paddingHorizontal: 4, height: 24 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        {c.name}
                      </Text>
                      <Badge label={`[${c.code}]`} variant="info" size="sm" />
                      <Badge
                        label={c.isGpsEnabled !== false ? 'GPS Enabled' : 'Simple Punch Only'}
                        variant={c.isGpsEnabled !== false ? 'success' : 'warning'}
                        size="sm"
                      />
                    </View>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {!isMasterCompany && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('CompanyWizard', { companyId: c.id })}
                      style={{ padding: 6, marginRight: 4 }}
                    >
                      <AppIcon name="edit" color={theme.colors.text.secondary} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(c.id, c.name)}
                      style={{ padding: 6 }}
                    >
                      <AppIcon name="close" color={theme.colors.semantic.error} size={18} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={[styles.statsRow, { borderTopColor: theme.colors.surface.border }]}>
                <View style={styles.statBox}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Users</Text>
                  <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                    {c._count?.users ?? 0}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Branches</Text>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                    {c._count?.branches ?? 0}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Departments</Text>
                  <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                    {c._count?.departments ?? 0}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
        )}
      </ScrollView>

      {/* FAB: Add Company */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.brand.primary }]}
        onPress={() => navigation.navigate('CompanyWizard')}
        activeOpacity={0.9}
      >
        <AppIcon name="add" color="#FFFFFF" size={24} />
        <Text style={[typography.bodySm, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
          Add Company
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  searchRow: {
    marginVertical: 12,
  },
  companyCard: {
    marginBottom: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
