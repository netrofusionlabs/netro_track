import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import {
  ScreenHeader,
  Card,
  SearchInput,
  LoadingState,
  EmptyState,
  Badge,
  StatusBadge,
  Avatar,
  AppIcon,
} from '../../../shared/components';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { useRefreshOnFocus } from '../../../shared/utils/useRefreshOnFocus';
import {
  useUsers,
  useDeactivateUser,
  useActivateUser,
  useResetUserCredentials,
} from '../hooks/useUserManagement';
import { EmployeeRecord } from '../types';
import { UserDetailSheet } from '../components/UserDetailSheet';
import { RemoveManagerModal } from '../components/RemoveManagerModal';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';
import { useAuthStore } from '../../auth/stores/authStore';
import { useCompanyDetail } from '../../companies/hooks/useCompanies';
import { companyService } from '../../companies/services/companyService';

type TabCategory = 'ALL' | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'UNASSIGNED';

export function UserManagementScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const permissions = usePermissions();
  const user = useAuthStore((state) => state.user);
  const { data: company, refetch: refetchCompany } = useCompanyDetail(user?.companyId);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Managers only have the EMPLOYEE tab; default to it so the first query is correctly scoped
  const [activeTab, setActiveTab] = useState<TabCategory>(
    permissions.isManager ? 'EMPLOYEE' : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<EmployeeRecord | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);

  const [removeManagerTarget, setRemoveManagerTarget] = useState<EmployeeRecord | null>(null);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);

  // Debounce search query to prevent unnecessary API hammering
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to page 1 on tab or status change
  const handleTabChange = (newTab: TabCategory) => {
    setActiveTab(newTab);
    setPage(1);
  };

  const handleStatusChange = (newStatus: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const { data: paginatedData, isLoading, isFetching, refetch } = useUsers({
    page,
    pageSize: 15,
    search: debouncedSearch,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    tab: activeTab !== 'ALL' ? activeTab : undefined,
  });

  const users = useMemo(() => paginatedData?.items || [], [paginatedData?.items]);
  const pagination = paginatedData?.pagination || {
    page: 1,
    pageSize: 15,
    totalItems: users.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  };

  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const resetCredentialsMutation = useResetUserCredentials();

  useRefreshOnFocus(refetch);

  const handleResetCredentials = (user: EmployeeRecord) => {
    Alert.alert(
      'Confirm Credentials Reset',
      `Are you sure you want to reset password to "Password123!" and clear MPIN for ${user.name} (${user.employeeId})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Default',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await resetCredentialsMutation.mutateAsync(user.id);
              Alert.alert(
                'Credentials Reset',
                res.message || `Password reset to Password123! and MPIN cleared for ${user.name}.`
              );
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to reset credentials.');
            }
          },
        },
      ]
    );
  };

  // Tab, search, and status filters are all sent to the backend as query params.
  // Client-side we only apply the rank safety filter (never show users ranked above the actor).
  const filteredUsers = useMemo(() => {
    const { ROLE_HIERARCHY } = require('@netrotrack/shared');
    return users.filter((u) => {
      const targetRank = ROLE_HIERARCHY[u.role as UserRole] ?? 0;
      return targetRank <= permissions.userRank;
    });
  }, [users, permissions.userRank]);

  const handleDeactivate = (user: EmployeeRecord) => {
    Alert.alert(
      'Confirm Deactivation',
      `Are you sure you want to deactivate ${user.name}? They will be logged out and unable to access the application.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateMutation.mutateAsync(user.id);
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to deactivate user.');
            }
          },
        },
      ]
    );
  };

  const handleActivate = async (user: EmployeeRecord) => {
    try {
      await activateMutation.mutateAsync(user.id);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reactivate user.');
    }
  };

  const availableTabs = useMemo(() => {
    // Managers only see their assigned employees — no "All Users" tab
    if (permissions.isManager) {
      return [{ key: 'EMPLOYEE' as TabCategory, label: 'Employees' }];
    }

    const tabs: { key: TabCategory; label: string }[] = [{ key: 'ALL', label: 'All Users' }];

    if (permissions.isSuperAdmin) {
      tabs.push({ key: 'SUPER_ADMIN', label: 'Super Admins' });
      tabs.push({ key: 'COMPANY_ADMIN', label: 'Company Admins' });
      tabs.push({ key: 'HR', label: 'HR' });
      tabs.push({ key: 'MANAGER', label: 'Managers' });
      tabs.push({ key: 'EMPLOYEE', label: 'Employees' });
      tabs.push({ key: 'UNASSIGNED', label: 'Unassigned' });
    } else if (permissions.isCompanyAdmin) {
      tabs.push({ key: 'COMPANY_ADMIN', label: 'Admins' });
      tabs.push({ key: 'HR', label: 'HR' });
      tabs.push({ key: 'MANAGER', label: 'Managers' });
      tabs.push({ key: 'EMPLOYEE', label: 'Employees' });
      tabs.push({ key: 'UNASSIGNED', label: 'Unassigned' });
    } else if (permissions.isHr) {
      tabs.push({ key: 'HR', label: 'HR' });
      tabs.push({ key: 'MANAGER', label: 'Managers' });
      tabs.push({ key: 'EMPLOYEE', label: 'Employees' });
      tabs.push({ key: 'UNASSIGNED', label: 'Unassigned' });
    }

    return tabs;
  }, [permissions.isSuperAdmin, permissions.isCompanyAdmin, permissions.isHr, permissions.isManager]);

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader
        title="User Management"
        subtitle="Manage company directory, credentials & role hierarchy"
        actionLabel={permissions.canCreateUsers ? "Add User" : undefined}
        actionIcon={permissions.canCreateUsers ? "addUser" : undefined}
        onAction={permissions.canCreateUsers ? () => navigation.navigate('AddUser') : undefined}
        onBackPress={() => {
          if (navigation) {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              const parent = navigation.getParent();
              if (parent && parent.canGoBack()) {
                parent.goBack();
              } else {
                navigation.navigate('Home');
              }
            }
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tenant Companies Management Link (Super Admin only) */}
        {permissions.isSuperAdmin && (
          <TouchableOpacity
            style={[styles.manageCompaniesBtn, { backgroundColor: theme.colors.brand.primaryLight, borderColor: theme.colors.brand.primary }]}
            onPress={() => navigation.navigate('CompanyManagement')}
          >
            <AppIcon name="document" color={theme.colors.brand.primary} size={18} />
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700', marginLeft: 8 }]}>
              Manage Tenant Companies & Register New Company
            </Text>
          </TouchableOpacity>
        )}

        {/* Company Profile & Logo Management (Company Admin only) */}
        {permissions.isCompanyAdmin && company && (
          <Card variant="outlined" style={styles.companyAdminCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (!user?.companyId) return;
                  const result = await launchImageLibrary({
                    mediaType: 'photo',
                    quality: 0.8,
                    includeBase64: true,
                  });

                  if (result.didCancel || !result.assets || result.assets.length === 0) return;
                  const asset = result.assets[0];
                  if (!asset.base64 || !asset.type) {
                    Alert.alert('Error', 'Unable to read image data.');
                    return;
                  }

                  setIsUploadingLogo(true);
                  try {
                    const { uploadUrl, fileId } = await companyService.getLogoUploadUrl(user.companyId, asset.type);
                    await companyService.uploadToR2(uploadUrl, asset.base64, asset.type);
                    await companyService.completeLogoUpload(user.companyId, fileId);
                    await refetchCompany();
                    Alert.alert('Success', 'Company logo updated successfully!');
                  } catch (err: any) {
                    Alert.alert('Upload Failed', err?.message || 'Failed to update company logo');
                  } finally {
                    setIsUploadingLogo(false);
                  }
                }}
                disabled={isUploadingLogo}
                activeOpacity={0.8}
                style={{ position: 'relative' }}
              >
                <Avatar name={company.name} source={company.companyLogoUrl} size="lg" />
                <View style={[styles.cameraBadge, { backgroundColor: theme.colors.brand.primary }]}>
                  {isUploadingLogo ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AppIcon name="camera" size={12} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {company.name}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  Code: <Text style={{ fontWeight: '700', color: theme.colors.brand.primary }}>{company.code}</Text> · {company.city || 'India'}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (!user?.companyId) return;
                    const result = await launchImageLibrary({
                      mediaType: 'photo',
                      quality: 0.8,
                      includeBase64: true,
                    });

                    if (result.didCancel || !result.assets || result.assets.length === 0) return;
                    const asset = result.assets[0];
                    if (!asset.base64 || !asset.type) {
                      Alert.alert('Error', 'Unable to read image data.');
                      return;
                    }

                    setIsUploadingLogo(true);
                    try {
                      const { uploadUrl, fileId } = await companyService.getLogoUploadUrl(user.companyId, asset.type);
                      await companyService.uploadToR2(uploadUrl, asset.base64, asset.type);
                      await companyService.completeLogoUpload(user.companyId, fileId);
                      await refetchCompany();
                      Alert.alert('Success', 'Company logo updated successfully!');
                    } catch (err: any) {
                      Alert.alert('Upload Failed', err?.message || 'Failed to update company logo');
                    } finally {
                      setIsUploadingLogo(false);
                    }
                  }}
                  disabled={isUploadingLogo}
                  style={{ marginTop: 6 }}
                >
                  <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                    {isUploadingLogo ? 'Uploading Logo...' : '📷 Change Company Logo'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.editCompanyBtn,
                  { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border },
                ]}
                onPress={() => navigation.navigate('CompanyWizard', { companyId: user?.companyId })}
              >
                <AppIcon name="edit" size={16} color={theme.colors.brand.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Company Admin Settings Panel */}
        {(permissions.isCompanyAdmin || permissions.isHr) && (
          <Card
            variant="outlined"
            onPress={() => navigation.navigate('AttendancePolicies')}
            style={styles.quickActionCard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.brand.secondary }]}>
                <AppIcon name="attendance" size={20} color={theme.colors.brand.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  Attendance / Punch Policies
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                  Configure selfie, GPS & vehicle requirements
                </Text>
              </View>
              <AppIcon name="chevronRight" size={16} color={theme.colors.text.tertiary} />
            </View>
          </Card>
        )}

        {/* Tab Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? theme.colors.brand.primary : theme.colors.surface.card,
                    borderColor: isActive ? theme.colors.brand.primary : theme.colors.surface.border,
                  },
                ]}
                onPress={() => handleTabChange(tab.key)}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isActive ? theme.colors.text.inverse : theme.colors.text.primary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search & Status Filter */}
        <View style={styles.filterSection}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search API by name, ID, or email..."
          />

          <View style={styles.statusChipsRow}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => {
              const isSelected = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusChip,
                    {
                      borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                      backgroundColor: isSelected ? theme.colors.brand.primaryLight : 'transparent',
                    },
                  ]}
                  onPress={() => handleStatusChange(st)}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? theme.colors.brand.primary : theme.colors.text.secondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {st === 'ALL' ? 'All Status' : st === 'ACTIVE' ? 'Active Only' : 'Inactive Only'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Loading / Fetching State */}
        {isLoading ? (
          <LoadingState message="Searching user directory..." />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon="employees"
            title="No Users Found"
            subtitle="Try adjusting your search query or tab filters."
          />
        ) : (
          /* User Card List */
          <>
            {filteredUsers.map((u) => {
              const roleLabel = ROLE_DISPLAY_LABELS[u.role as UserRole] || u.role;
              const isInactive = u.status === 'INACTIVE';

              return (
                <Card
                  key={u.id}
                  variant="outlined"
                  style={[
                    styles.userCard,
                    isInactive ? { opacity: 0.65, backgroundColor: theme.colors.surface.background } : {},
                  ] as any}
                >
                  <TouchableOpacity
                    style={styles.userCardInner}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedUser(u);
                      setDetailSheetVisible(true);
                    }}
                  >
                    <Avatar name={u.name} size="md" />

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[typography.headingSm, { color: theme.colors.text.primary, flex: 1, marginRight: 8 }]}
                          numberOfLines={1}
                        >
                          {u.name}
                        </Text>
                        <StatusBadge
                          status={isInactive ? 'offline' : 'active'}
                          label={isInactive ? 'Inactive' : 'Active'}
                          size="sm"
                        />
                      </View>

                      {/* Badges row: Company code + GPS Status */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {u.company?.code && (
                          <Badge label={u.company.code} variant="info" size="sm" />
                        )}
                        <Badge
                          label={u.isGpsTracked !== false ? 'GPS Tracked' : 'No GPS'}
                          variant={u.isGpsTracked !== false ? 'success' : 'default'}
                          size="sm"
                        />
                      </View>

                      <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                        {u.employeeId} · {u.designation?.name || roleLabel}
                      </Text>

                      {u.role === 'EMPLOYEE' && (
                        <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 2 }]}>
                          {u.manager ? `Manager: ${u.manager.name}` : 'Unassigned (Company Pool)'}
                        </Text>
                      )}

                      {u.role === 'MANAGER' && (
                        <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                          Team size: {u._count?.subordinates ?? 0} assigned agents
                        </Text>
                      )}
                    </View>

                    <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={18} />
                  </TouchableOpacity>
                </Card>
              );
            })}

            {/* Server-side Pagination Bar */}
            {pagination.totalPages > 1 && (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    { backgroundColor: pagination.hasPrevious ? theme.colors.brand.primary : theme.colors.surface.border },
                  ]}
                  disabled={!pagination.hasPrevious || isFetching}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={[typography.bodySm, { color: '#FFFFFF', fontWeight: '700' }]}>← Prev</Text>
                </TouchableOpacity>

                <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '600' }]}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} Total)
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    { backgroundColor: pagination.hasNext ? theme.colors.brand.primary : theme.colors.surface.border },
                  ]}
                  disabled={!pagination.hasNext || isFetching}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={[typography.bodySm, { color: '#FFFFFF', fontWeight: '700' }]}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB: Add User (only if authorized) */}
      {permissions.canCreateUsers && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.brand.primary }]}
          onPress={() => navigation.navigate('AddUser')}
          activeOpacity={0.9}
        >
          <AppIcon name="add" color="#FFFFFF" size={24} />
          <Text style={[typography.bodySm, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
            Add User
          </Text>
        </TouchableOpacity>
      )}

      {/* User Detail Action Sheet */}
      <UserDetailSheet
        visible={detailSheetVisible}
        user={selectedUser}
        onClose={() => setDetailSheetVisible(false)}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
        onResetCredentials={handleResetCredentials}
        onRemoveManager={(m) => {
          setRemoveManagerTarget(m);
          setRemoveModalVisible(true);
        }}
        onEditUser={(u) => navigation.navigate('EditUser', { user: u })}
        onViewDetail={(u) => navigation.navigate('EmployeeDetail', { employee: u })}
      />

      {/* Remove Manager Modal Workflow */}
      <RemoveManagerModal
        visible={removeModalVisible}
        manager={removeManagerTarget}
        onClose={() => setRemoveModalVisible(false)}
        onSuccess={() => refetch()}
      />
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
  manageCompaniesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  tabsRow: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
  },
  tabChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  filterSection: {
    marginBottom: 12,
  },
  statusChipsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  userCard: {
    marginBottom: 10,
    padding: 12,
  },
  userCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  companyAdminCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editCompanyBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCard: {
    marginBottom: 12,
  },
  quickActionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
