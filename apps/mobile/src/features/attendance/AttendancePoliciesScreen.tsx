import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Button,
  AppIcon,
  Badge,
  IconButton,
  Select,
} from '../../shared/components';
import {
  useAttendancePolicies,
  useDeleteAttendancePolicy,
  useDuplicateAttendancePolicy,
  useUpdateAttendancePolicy,
  useAssignAttendancePolicy,
} from './hooks/useAttendance';
import { useCompanies, useCompanyDetail } from '../companies/hooks/useCompanies';
import { useAuthStore } from '../auth/stores/authStore';

const POLICY_TYPES = [
  { type: 'ALL', label: 'All', icon: 'document' as const },
  { type: 'ATTENDANCE', label: 'Attendance', icon: 'attendance' as const },
  { type: 'LEAVE', label: 'Leave', icon: 'calendar' as const },
  { type: 'EXPENSE', label: 'Expense', icon: 'money' as const },
  { type: 'TRACKING', label: 'Tracking', icon: 'location' as const },
  { type: 'VISIT', label: 'Visits', icon: 'visits' as const },
  { type: 'INSPECTION', label: 'Inspections', icon: 'inspections' as const },
];

export function AttendancePoliciesScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isPlatformAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER_SUPER_ADMIN';

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.companyId);
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const { data: policies = [], isLoading, error, refetch } = useAttendancePolicies(selectedCompanyId, selectedType);
  const { data: company } = useCompanyDetail(selectedCompanyId);
  const { data: companies = [] } = useCompanies();

  const deletePolicy = useDeleteAttendancePolicy();
  const duplicatePolicy = useDuplicateAttendancePolicy();
  const updatePolicy = useUpdateAttendancePolicy();
  const assignPolicy = useAssignAttendancePolicy();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDuplicate = (id: string, name: string) => {
    duplicatePolicy.mutate(
      { id, companyId: selectedCompanyId },
      {
        onSuccess: () => {
          Alert.alert('Duplicated', `Duplicated policy "${name}" successfully.`);
          void refetch();
        },
        onError: (err) => Alert.alert('Error', err.message),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Policy', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePolicy.mutate(
            { id, companyId: selectedCompanyId },
            {
              onSuccess: () => {
                Alert.alert('Deleted', `Policy "${name}" deleted.`);
                void refetch();
              },
              onError: (err) => Alert.alert('Delete Failed', err.message),
            }
          );
        },
      },
    ]);
  };

  const handleToggleActive = (policy: any) => {
    updatePolicy.mutate(
      { id: policy.id, payload: { isActive: !policy.isActive, companyId: selectedCompanyId } },
      {
        onSuccess: () => void refetch(),
        onError: (err) => Alert.alert('Error', err.message),
      }
    );
  };

  const handleSetDefault = (policyId: string, name: string) => {
    Alert.alert('Set Default', `Make "${name}" the default policy for all company employees?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set Default',
        onPress: () => {
          assignPolicy.mutate(
            { policyId, targetType: 'COMPANY', targetId: selectedCompanyId!, companyId: selectedCompanyId },
            {
              onSuccess: () => {
                Alert.alert('Success', `"${name}" is now the default policy.`);
                void refetch();
              },
              onError: (err) => Alert.alert('Error', err.message),
            }
          );
        },
      },
    ]);
  };

  const renderPolicyCard = (policy: any) => {
    const isCompanyDefault = (company as any)?.defaultAttendancePolicyId === policy.id;
    const type = policy.type || 'ATTENDANCE';
    const cfg = policy.config || {};

    const getSummary = () => {
      switch (type) {
        case 'ATTENDANCE': {
          const inItems = [];
          if (policy.punchInConfig?.selfie !== 'DISABLED') inItems.push('Selfie');
          if (policy.punchInConfig?.gps !== 'DISABLED') inItems.push('GPS');
          if (policy.punchInConfig?.vehicleMeter !== 'DISABLED') inItems.push('Meter');
          if (policy.punchInConfig?.remarks !== 'DISABLED') inItems.push('Remarks');
          return `Punch in: ${inItems.length ? inItems.join(', ') : 'Standard'}`;
        }
        case 'LEAVE': {
          const al = cfg.annualLeaveQuota ?? 18;
          const sl = cfg.sickLeaveQuota ?? 12;
          return `Quotas: ${al} Annual · ${sl} Sick days`;
        }
        case 'EXPENSE': {
          const maxClaim = cfg.maxDailyClaim ?? 2000;
          const rate = cfg.mileageRatePerKm ?? 12;
          return `Max daily: $${maxClaim} · Mileage: $${rate}/km`;
        }
        case 'TRACKING': {
          const interval = cfg.trackingIntervalSeconds ?? 120;
          const geo = cfg.geofenceRadiusMeters ?? 100;
          return `Sync interval: ${interval}s · Geofence: ${geo}m`;
        }
        case 'VISIT': {
          const prox = cfg.maxAllowedDistanceMeters ?? 200;
          const dur = cfg.minVisitDurationMinutes ?? 5;
          return `Max proximity: ${prox}m · Min duration: ${dur}m`;
        }
        case 'INSPECTION': {
          const photos = cfg.minPhotosRequired ?? 2;
          const pass = cfg.passThresholdScore ?? 70;
          return `Min photos: ${photos} · Pass threshold: ${pass}%`;
        }
        default:
          return 'Standard configuration';
      }
    };

    return (
      <Card key={policy.id} style={styles.card} variant={isCompanyDefault ? 'elevated' : 'outlined'}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {policy.name}
              </Text>
              <Badge label={type} variant="info" size="sm" />
              {isCompanyDefault && <Badge label="Default" variant="success" size="sm" />}
              {!policy.isActive && <Badge label="Inactive" variant="error" size="sm" />}
            </View>
            {policy.description ? (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                {policy.description}
              </Text>
            ) : null}
          </View>

          {/* Quick toggle default setting (only for attendance) */}
          {type === 'ATTENDANCE' && !isCompanyDefault && policy.isActive && (
            <TouchableOpacity
              onPress={() => handleSetDefault(policy.id, policy.name)}
              style={[styles.defaultBtn, { borderColor: theme.colors.brand.primary }]}
            >
              <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                Set Default
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements Details Row */}
        <View style={[styles.detailsSection, { borderTopColor: theme.colors.surface.border }]}>
          <View style={styles.detailsRow}>
            <AppIcon name="document" color={theme.colors.brand.primary} size={14} />
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginLeft: 6 }]}>
              Rules: <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>{getSummary()}</Text>
            </Text>
          </View>
        </View>

        {/* Footer actions row */}
        <View style={[styles.actionsRow, { borderTopColor: theme.colors.surface.border }]}>
          {/* Active Status switch button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleActive(policy)}
          >
            <AppIcon name="success" color={policy.isActive ? theme.colors.semantic.success : theme.colors.text.tertiary} size={16} />
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 6 }]}>
              {policy.isActive ? 'Active' : 'Draft'}
            </Text>
          </TouchableOpacity>

          {/* Duplicate button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDuplicate(policy.id, policy.name)}
          >
            <AppIcon name="document" color={theme.colors.brand.primary} size={16} />
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 6 }]}>
              Copy
            </Text>
          </TouchableOpacity>

          {/* Delete button */}
          {!isCompanyDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(policy.id, policy.name)}
            >
              <AppIcon name="trash" color={theme.colors.semantic.error} size={16} />
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 6 }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}

          {/* Edit / View Details */}
          <TouchableOpacity
            style={[styles.actionButton, { marginLeft: 'auto' }]}
            onPress={() => navigation.navigate('AttendancePolicyDetail', { policyId: policy.id, companyId: selectedCompanyId })}
          >
            <Text style={[typography.buttonSm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
              Manage →
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity
          onPress={() => {
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
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Governance Policies</Text>
        <IconButton
          icon="add"
          variant="primary"
          size="md"
          onPress={() => navigation.navigate('EditAttendancePolicy', { companyId: selectedCompanyId, defaultType: selectedType !== 'ALL' ? selectedType : 'ATTENDANCE' })}
        />
      </View>

      {/* Target Company Selector (Platform Admin Only) */}
      {isPlatformAdmin && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Select
            label="Target Tenant Company"
            placeholder="Select a company..."
            value={company?.name}
            icon="customers"
            onPress={() => {
              Alert.alert(
                'Select Tenant Company',
                'Choose a tenant company to manage policies for:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  ...companies.map((c: any) => ({
                    text: `${c.name} (${c.code})`,
                    onPress: () => setSelectedCompanyId(c.id),
                  })),
                ]
              );
            }}
          />
        </View>
      )}

      {/* Type Filter Chips Bar */}
      <View style={styles.chipBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {POLICY_TYPES.map((pt) => {
            const isSelected = selectedType === pt.type;
            return (
              <TouchableOpacity
                key={pt.type}
                onPress={() => setSelectedType(pt.type)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.card,
                    borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                  },
                ]}
              >
                <AppIcon
                  name={pt.icon}
                  size={14}
                  color={isSelected ? '#ffffff' : theme.colors.text.secondary}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isSelected ? '#ffffff' : theme.colors.text.primary,
                      fontWeight: isSelected ? '700' : '500',
                      marginLeft: 6,
                    },
                  ]}
                >
                  {pt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        </View>
      ) : error ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <AppIcon name="alert" color={theme.colors.semantic.error} size={48} />
          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, textAlign: 'center' }]}>
            Failed to load policies
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8, textAlign: 'center' }]}>
            {error.message}
          </Text>
          <Button label="Retry" onPress={() => refetch()} style={{ marginTop: 24 }} />
        </View>
      ) : policies.length === 0 ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={64} />
          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, textAlign: 'center' }]}>
            No Policies Found
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8, textAlign: 'center' }]}>
            Create your first policy to establish automated rules for your field teams.
          </Text>
          <Button
            label="Create New Policy"
            onPress={() => navigation.navigate('EditAttendancePolicy', { companyId: selectedCompanyId, defaultType: selectedType !== 'ALL' ? selectedType : 'ATTENDANCE' })}
            style={{ marginTop: 24 }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.brand.primary]}
              tintColor={theme.colors.brand.primary}
            />
          }
        >
          {policies.map(renderPolicyCard)}
        </ScrollView>
      )}
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
  chipBarWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb22',
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  defaultBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
