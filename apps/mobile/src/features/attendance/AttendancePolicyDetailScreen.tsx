import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Button,
  AppIcon,
  Badge,
  IconButton,
} from '../../shared/components';
import {
  useAttendancePolicyDetail,
  useAttendancePolicyAssignments,
  useAssignAttendancePolicy,
} from './hooks/useAttendance';
import { useCompanyDetail } from '../companies/hooks/useCompanies';
import { useAuthStore } from '../auth/stores/authStore';

const STANDARD_LABELS: Record<string, string> = {
  selfie: 'Selfie Photo',
  gps: 'GPS Tracking (Live Route)',
  vehicleMeter: 'Vehicle Meter Reading',
  vehiclePhoto: 'Vehicle Photo',
  workSitePhoto: 'Work Site Photo',
  customerLocation: 'Customer Location',
  remarks: 'Remarks / Notes',
  signature: 'Digital Signature',
};

export function AttendancePolicyDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { policyId } = route.params;
  const routeCompanyId = route.params?.companyId as string | undefined;
  const defaultCompanyId = useAuthStore((s) => s.user?.companyId);
  const companyId = routeCompanyId || defaultCompanyId;

  const { data: policy, isLoading: loadingPolicy, refetch: r1 } = useAttendancePolicyDetail(policyId, companyId);
  const { data: assignments, isLoading: loadingAssignments, refetch: r2 } = useAttendancePolicyAssignments(policyId, companyId);
  const { data: company } = useCompanyDetail(companyId);

  const assignPolicy = useAssignAttendancePolicy();

  // Tab switcher state
  const [activeTab, setActiveTab] = useState<'config' | 'assignments'>('config');

  const handleSetDefaultCompanyPolicy = () => {
    if (!policy) return;

    Alert.alert('Make Default', `Set "${policy.name}" as default company policy?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          assignPolicy.mutate(
            { policyId: policy.id, targetType: 'COMPANY', targetId: companyId!, companyId, policyType: policy.type || 'ATTENDANCE' },
            {
              onSuccess: () => {
                Alert.alert('Success', 'Policy is now set as the company default.');
                void r1();
                void r2();
              },
              onError: (err) => Alert.alert('Error', err.message),
            }
          );
        },
      },
    ]);
  };

  if (loadingPolicy || loadingAssignments) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  if (!policy) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background, paddingHorizontal: 24 }]}>
        <AppIcon name="alert" color={theme.colors.semantic.error} size={48} />
        <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16 }]}>
          Policy Not Found
        </Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const type = policy.type || 'ATTENDANCE';
  const cfg = policy.config || {};
  const isCompanyDefault = (company as any)?.defaultAttendancePolicyId === policy.id;

  const renderConfigTab = () => {
    if (type === 'ATTENDANCE') {
      const renderConfigSection = (pCfg: any) => {
        if (!pCfg) return null;
        const standardKeys = Object.keys(STANDARD_LABELS);
        return (
          <View style={{ gap: 8 }}>
            {standardKeys.map((key) => {
              const status = pCfg[key] || 'DISABLED';
              if (status === 'DISABLED') return null;

              return (
                <View key={key} style={styles.configItemRow}>
                  <AppIcon name="success" color={status === 'REQUIRED' ? theme.colors.brand.primary : theme.colors.text.tertiary} size={14} />
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginLeft: 8, flex: 1 }]}>
                    {STANDARD_LABELS[key]}
                  </Text>
                  <Badge
                    label={status === 'REQUIRED' ? 'Required' : 'Optional'}
                    variant={status === 'REQUIRED' ? 'info' : 'default'}
                    size="sm"
                  />
                </View>
              );
            })}
          </View>
        );
      };

      const reg = (policy as any).regularizationConfig || cfg.regularizationConfig || {
        allowRegularization: true,
        allowMissedPunch: true,
        allowTimeCorrection: true,
        maxRequestsPerMonth: 5,
        regularizationWindowDays: 7,
      };

      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              📥 Punch In Evidence
            </Text>
            {renderConfigSection(policy.punchInConfig)}
          </Card>

          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              📤 Punch Out Evidence
            </Text>
            {renderConfigSection(policy.punchOutConfig)}
          </Card>

          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              🛠️ Regularization Policy
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>
                Allow Regularization
              </Text>
              <Badge
                label={reg.allowRegularization ? 'Enabled' : 'Disabled'}
                variant={reg.allowRegularization ? 'success' : 'default'}
                size="sm"
              />
            </View>
            {reg.allowRegularization && (
              <>
                <View style={styles.configItemRow}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>
                    Max Requests per Month
                  </Text>
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                    {reg.maxRequestsPerMonth}
                  </Text>
                </View>
                <View style={styles.configItemRow}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>
                    Window Limit (Days)
                  </Text>
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                    {reg.regularizationWindowDays} days
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>
      );
    }

    if (type === 'LEAVE') {
      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              🌴 Annual Leave Entitlements
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Annual Leaves</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.annualLeaveQuota ?? 18} days</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Sick Leaves</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.sickLeaveQuota ?? 12} days</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Casual Leaves</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.casualLeaveQuota ?? 12} days</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Sandwich Rule</Text>
              <Badge label={cfg.allowSandwichLeaves !== false ? 'Enabled' : 'Disabled'} variant="info" size="sm" />
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Half-Day Leaves</Text>
              <Badge label={cfg.allowHalfDay !== false ? 'Allowed' : 'Not Allowed'} variant="info" size="sm" />
            </View>
          </Card>
        </View>
      );
    }

    if (type === 'EXPENSE') {
      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              💵 Expense Limits & Reimbursements
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Daily Claim Ceiling</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>${cfg.maxDailyClaim ?? 2000}</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Receipt Threshold</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>${cfg.receiptMandatoryThreshold ?? 500}</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Mileage Rate</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>${cfg.mileageRatePerKm ?? 12} / km</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Auto-Approval Limit</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>${cfg.autoApprovalLimit ?? 500}</Text>
            </View>
          </Card>
        </View>
      );
    }

    if (type === 'TRACKING') {
      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              📍 GPS & Tracking Rules
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Sync Interval</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.trackingIntervalSeconds ?? 120}s</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Geofence Accuracy</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.geofenceRadiusMeters ?? 100}m</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Working Hours Only</Text>
              <Badge label={cfg.workingHoursOnly !== false ? 'Yes' : 'No'} variant="info" size="sm" />
            </View>
          </Card>
        </View>
      );
    }

    if (type === 'VISIT') {
      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              🤝 Customer Visit Verification
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Max Proximity</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.maxAllowedDistanceMeters ?? 200}m</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Min Visit Duration</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.minVisitDurationMinutes ?? 5} mins</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Check-in Selfie</Text>
              <Badge label={cfg.requireCheckInSelfie ? 'Required' : 'Optional'} variant="info" size="sm" />
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Customer Signature</Text>
              <Badge label={cfg.requireSignature !== false ? 'Required' : 'Optional'} variant="info" size="sm" />
            </View>
          </Card>
        </View>
      );
    }

    if (type === 'INSPECTION') {
      return (
        <View style={{ gap: 16 }}>
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
              🔍 Audit & Inspection Rules
            </Text>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Min Photos Required</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.minPhotosRequired ?? 2}</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>Passing Threshold</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '700' }]}>{cfg.passThresholdScore ?? 70}%</Text>
            </View>
            <View style={styles.configItemRow}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>100% Checklist Enforced</Text>
              <Badge label={cfg.requireChecklistCompletion !== false ? 'Yes' : 'No'} variant="info" size="sm" />
            </View>
          </Card>
        </View>
      );
    }

    return null;
  };

  const renderAssignmentsTab = () => {
    if (!assignments) return null;
    const { counts, details } = assignments;

    return (
      <View style={{ gap: 16 }}>
        {/* Summary Stat Card */}
        <Card style={styles.summaryStatsBox}>
          <View style={styles.statCol}>
            <Text style={[typography.displaySm, { color: theme.colors.brand.primary, textAlign: 'center' }]}>
              {counts.users}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Employees
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[typography.displaySm, { color: theme.colors.brand.primary, textAlign: 'center' }]}>
              {counts.departments}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Departments
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[typography.displaySm, { color: theme.colors.brand.primary, textAlign: 'center' }]}>
              {counts.designations}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Designations
            </Text>
          </View>
        </Card>

        {/* granularity detail lists */}
        {details.users && details.users.length > 0 && (
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 10 }]}>
              👤 Assigned Employees ({details.users.length})
            </Text>
            {details.users.map((u: any) => (
              <View key={u.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                    {u.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                    {u.employeeId} · {u.role}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Employees', { screen: 'EmployeeDetail', params: { id: u.id } })}
                >
                  <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                    Profile
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {details.departments && details.departments.length > 0 && (
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 10 }]}>
              🏢 Assigned Departments ({details.departments.length})
            </Text>
            {details.departments.map((d: any) => (
              <View key={d.id} style={styles.itemRow}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  {d.name}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {details.designations && details.designations.length > 0 && (
          <Card>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 10 }]}>
              💼 Assigned Designations ({details.designations.length})
            </Text>
            {details.designations.map((d: any) => (
              <View key={d.id} style={styles.itemRow}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  {d.name}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {counts.total === 0 && (
          <View style={styles.emptyAssignments}>
            <AppIcon name="employees" color={theme.colors.text.tertiary} size={36} />
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8 }]}>
              This policy is not assigned to any entity yet.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
          {policy.name}
        </Text>
        <IconButton
          icon="edit"
          variant="primary"
          size="md"
          onPress={() => navigation.navigate('EditAttendancePolicy', { policyId: policy.id, companyId })}
        />
      </View>

      {/* Hero Overview */}
      <View style={[styles.heroBlock, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge label={type} variant="info" size="md" />
          {isCompanyDefault && <Badge label="Company Default" variant="success" size="md" />}
          {!policy.isActive && <Badge label="Deactivated" variant="error" size="md" />}
        </View>
        <Text style={[typography.bodyMd, { color: theme.colors.text.secondary, marginTop: 6 }]}>
          {policy.description || 'No policy description provided.'}
        </Text>

        {type === 'ATTENDANCE' && !isCompanyDefault && policy.isActive && (
          <Button
            label="Make Company Default"
            variant="outline"
            size="md"
            onPress={handleSetDefaultCompanyPolicy}
            style={{ marginTop: 14 }}
          />
        )}

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'config' && { borderBottomColor: theme.colors.brand.primary }]}
            onPress={() => setActiveTab('config')}
          >
            <Text style={[typography.buttonSm, { color: activeTab === 'config' ? theme.colors.brand.primary : theme.colors.text.secondary, fontWeight: '700' }]}>
              Policy Config
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'assignments' && { borderBottomColor: theme.colors.brand.primary }]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[typography.buttonSm, { color: activeTab === 'assignments' ? theme.colors.brand.primary : theme.colors.text.secondary, fontWeight: '700' }]}>
              Assignments ({assignments?.counts?.total ?? 0})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'config' ? renderConfigTab() : renderAssignmentsTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  heroBlock: {
    padding: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  configItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  summaryStatsBox: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  emptyAssignments: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
