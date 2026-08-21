import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Input,
  Button,
  AppIcon,
  SegmentedControl,
} from '../../shared/components';
import {
  useAttendancePolicyDetail,
  useCreateAttendancePolicy,
  useUpdateAttendancePolicy,
} from './hooks/useAttendance';

const POLICY_TYPES = [
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'LEAVE', label: 'Leave' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'VISIT', label: 'Visits' },
  { value: 'INSPECTION', label: 'Inspections' },
];

const STANDARD_FIELDS = [
  { key: 'selfie', label: 'Selfie Photo' },
  { key: 'gps', label: 'GPS Tracking (Live Route)' },
  { key: 'vehicleMeter', label: 'Vehicle Meter Reading' },
  { key: 'vehiclePhoto', label: 'Vehicle Photo' },
  { key: 'workSitePhoto', label: 'Work Site Photo' },
  { key: 'customerLocation', label: 'Customer Location' },
  { key: 'remarks', label: 'Remarks / Notes' },
  { key: 'signature', label: 'Digital Signature' },
];

export function EditAttendancePolicyScreen({ route, navigation }: any) {
  const theme = useTheme();
  const policyId = route.params?.policyId as string | undefined;
  const companyId = route.params?.companyId as string | undefined;
  const defaultType = (route.params?.defaultType as string) || 'ATTENDANCE';
  const isEdit = !!policyId;

  const { data: policy, isLoading: loadingPolicy } = useAttendancePolicyDetail(policyId || '', companyId);
  const createPolicy = useCreateAttendancePolicy();
  const updatePolicy = useUpdateAttendancePolicy();

  // Policy Form states
  const [type, setType] = useState<string>(defaultType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Attendance Policy States
  const [allowRegularization, setAllowRegularization] = useState(true);
  const [allowMissedPunch, setAllowMissedPunch] = useState(true);
  const [allowTimeCorrection, setAllowTimeCorrection] = useState(true);
  const [maxRequestsPerMonth, setMaxRequestsPerMonth] = useState('5');
  const [regularizationWindowDays, setRegularizationWindowDays] = useState('7');
  const [punchInConfig, setPunchInConfig] = useState<Record<string, any>>({
    selfie: 'DISABLED',
    gps: 'DISABLED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'DISABLED',
    signature: 'DISABLED',
    customFields: [],
  });
  const [punchOutConfig, setPunchOutConfig] = useState<Record<string, any>>({
    selfie: 'DISABLED',
    gps: 'DISABLED',
    vehicleMeter: 'DISABLED',
    vehiclePhoto: 'DISABLED',
    workSitePhoto: 'DISABLED',
    customerLocation: 'DISABLED',
    remarks: 'DISABLED',
    signature: 'DISABLED',
    customFields: [],
  });

  // Leave Policy States
  const [annualLeaveQuota, setAnnualLeaveQuota] = useState('18');
  const [sickLeaveQuota, setSickLeaveQuota] = useState('12');
  const [casualLeaveQuota, setCasualLeaveQuota] = useState('12');
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState('10');
  const [allowSandwichLeaves, setAllowSandwichLeaves] = useState(true);
  const [allowHalfDay, setAllowHalfDay] = useState(true);

  // Expense Policy States
  const [maxDailyClaim, setMaxDailyClaim] = useState('2000');
  const [receiptMandatoryThreshold, setReceiptMandatoryThreshold] = useState('500');
  const [mileageRatePerKm, setMileageRatePerKm] = useState('12');
  const [autoApprovalLimit, setAutoApprovalLimit] = useState('500');

  // Tracking Policy States
  const [trackingIntervalSeconds, setTrackingIntervalSeconds] = useState('120');
  const [workingHoursOnly, setWorkingHoursOnly] = useState(true);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState('100');

  // Visit Policy States
  const [requireCheckInSelfie, setRequireCheckInSelfie] = useState(false);
  const [requireSignature, setRequireSignature] = useState(true);
  const [maxAllowedDistanceMeters, setMaxAllowedDistanceMeters] = useState('200');
  const [minVisitDurationMinutes, setMinVisitDurationMinutes] = useState('5');

  // Inspection Policy States
  const [minPhotosRequired, setMinPhotosRequired] = useState('2');
  const [requireChecklistCompletion, setRequireChecklistCompletion] = useState(true);
  const [passThresholdScore, setPassThresholdScore] = useState('70');

  // Populate data if editing
  useEffect(() => {
    if (isEdit && policy) {
      setType(policy.type || 'ATTENDANCE');
      setName(policy.name);
      setDescription(policy.description || '');
      setPunchInConfig(policy.punchInConfig || {});
      setPunchOutConfig(policy.punchOutConfig || {});

      const cfg = policy.config || {};
      if (policy.type === 'LEAVE' || cfg.annualLeaveQuota !== undefined) {
        setAnnualLeaveQuota(String(cfg.annualLeaveQuota ?? 18));
        setSickLeaveQuota(String(cfg.sickLeaveQuota ?? 12));
        setCasualLeaveQuota(String(cfg.casualLeaveQuota ?? 12));
        setMaxConsecutiveDays(String(cfg.maxConsecutiveDays ?? 10));
        setAllowSandwichLeaves(cfg.allowSandwichLeaves ?? true);
        setAllowHalfDay(cfg.allowHalfDay ?? true);
      }
      if (policy.type === 'EXPENSE' || cfg.maxDailyClaim !== undefined) {
        setMaxDailyClaim(String(cfg.maxDailyClaim ?? 2000));
        setReceiptMandatoryThreshold(String(cfg.receiptMandatoryThreshold ?? 500));
        setMileageRatePerKm(String(cfg.mileageRatePerKm ?? 12));
        setAutoApprovalLimit(String(cfg.autoApprovalLimit ?? 500));
      }
      if (policy.type === 'TRACKING' || cfg.trackingIntervalSeconds !== undefined) {
        setTrackingIntervalSeconds(String(cfg.trackingIntervalSeconds ?? 120));
        setWorkingHoursOnly(cfg.workingHoursOnly ?? true);
        setHighAccuracy(cfg.highAccuracy ?? true);
        setGeofenceRadiusMeters(String(cfg.geofenceRadiusMeters ?? 100));
      }
      if (policy.type === 'VISIT' || cfg.maxAllowedDistanceMeters !== undefined) {
        setRequireCheckInSelfie(cfg.requireCheckInSelfie ?? false);
        setRequireSignature(cfg.requireSignature ?? true);
        setMaxAllowedDistanceMeters(String(cfg.maxAllowedDistanceMeters ?? 200));
        setMinVisitDurationMinutes(String(cfg.minVisitDurationMinutes ?? 5));
      }
      if (policy.type === 'INSPECTION' || cfg.passThresholdScore !== undefined) {
        setMinPhotosRequired(String(cfg.minPhotosRequired ?? 2));
        setRequireChecklistCompletion(cfg.requireChecklistCompletion ?? true);
        setPassThresholdScore(String(cfg.passThresholdScore ?? 70));
      }

      const reg = (policy as any).regularizationConfig || cfg.regularizationConfig || {
        allowRegularization: true,
        allowMissedPunch: true,
        allowTimeCorrection: true,
        maxRequestsPerMonth: 5,
        regularizationWindowDays: 7,
      };
      setAllowRegularization(reg.allowRegularization ?? true);
      setAllowMissedPunch(reg.allowMissedPunch ?? true);
      setAllowTimeCorrection(reg.allowTimeCorrection ?? true);
      setMaxRequestsPerMonth(String(reg.maxRequestsPerMonth ?? 5));
      setRegularizationWindowDays(String(reg.regularizationWindowDays ?? 7));
    }
  }, [isEdit, policy]);

  const handleConfigChange = (target: 'in' | 'out', key: string, val: string) => {
    const setter = target === 'in' ? setPunchInConfig : setPunchOutConfig;
    setter((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Policy Name is required.');
      return;
    }

    let configPayload: Record<string, any> = {};

    switch (type) {
      case 'ATTENDANCE':
        configPayload = {
          punchInConfig,
          punchOutConfig,
          regularizationConfig: {
            allowRegularization,
            allowMissedPunch,
            allowTimeCorrection,
            maxRequestsPerMonth: parseInt(maxRequestsPerMonth, 10) || 0,
            regularizationWindowDays: parseInt(regularizationWindowDays, 10) || 0,
          },
        };
        break;
      case 'LEAVE':
        configPayload = {
          annualLeaveQuota: parseInt(annualLeaveQuota, 10) || 18,
          sickLeaveQuota: parseInt(sickLeaveQuota, 10) || 12,
          casualLeaveQuota: parseInt(casualLeaveQuota, 10) || 12,
          maxConsecutiveDays: parseInt(maxConsecutiveDays, 10) || 10,
          allowSandwichLeaves,
          allowHalfDay,
          noticePeriodDays: 2,
          requireManagerApproval: true,
        };
        break;
      case 'EXPENSE':
        configPayload = {
          maxDailyClaim: parseFloat(maxDailyClaim) || 2000,
          receiptMandatoryThreshold: parseFloat(receiptMandatoryThreshold) || 500,
          mileageRatePerKm: parseFloat(mileageRatePerKm) || 12,
          autoApprovalLimit: parseFloat(autoApprovalLimit) || 500,
          allowFuelExpense: true,
          allowFoodExpense: true,
          allowStayExpense: true,
          allowTravelExpense: true,
        };
        break;
      case 'TRACKING':
        configPayload = {
          trackingIntervalSeconds: parseInt(trackingIntervalSeconds, 10) || 120,
          workingHoursOnly,
          highAccuracy,
          batteryOptimization: true,
          geofenceRadiusMeters: parseInt(geofenceRadiusMeters, 10) || 100,
        };
        break;
      case 'VISIT':
        configPayload = {
          requireCheckInSelfie,
          requireSignature,
          maxAllowedDistanceMeters: parseInt(maxAllowedDistanceMeters, 10) || 200,
          minVisitDurationMinutes: parseInt(minVisitDurationMinutes, 10) || 5,
          requireMeetingNotes: true,
          allowOfflineVisits: true,
        };
        break;
      case 'INSPECTION':
        configPayload = {
          minPhotosRequired: parseInt(minPhotosRequired, 10) || 2,
          requireChecklistCompletion,
          requireSupervisorSignoff: false,
          passThresholdScore: parseInt(passThresholdScore, 10) || 70,
          requireGpsTagging: true,
        };
        break;
    }

    const payload = {
      type,
      name: name.trim(),
      description: description.trim() || null,
      config: configPayload,
      punchInConfig,
      punchOutConfig,
      regularizationConfig: {
        allowRegularization,
        allowMissedPunch,
        allowTimeCorrection,
        maxRequestsPerMonth: parseInt(maxRequestsPerMonth, 10) || 0,
        regularizationWindowDays: parseInt(regularizationWindowDays, 10) || 0,
      },
      companyId,
    };

    if (isEdit) {
      updatePolicy.mutate(
        { id: policyId!, payload },
        {
          onSuccess: () => {
            Alert.alert('Success', 'Policy updated successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
          onError: (err) => Alert.alert('Save Failed', err.message),
        }
      );
    } else {
      createPolicy.mutate(payload, {
        onSuccess: () => {
          Alert.alert('Success', 'Policy created successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (err) => Alert.alert('Create Failed', err.message),
      });
    }
  };

  if (isEdit && loadingPolicy) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.card, borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
          {isEdit ? 'Edit Policy' : 'Create Policy'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Category Picker (if new policy) */}
        {!isEdit && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Policy Category
            </Text>
            <View style={styles.typeGrid}>
              {POLICY_TYPES.map((pt) => {
                const isSelected = type === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    onPress={() => setType(pt.value)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                        borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.bodySm,
                        {
                          color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Section 1: Basic Information */}
        <Card style={styles.card} variant="outlined">
          <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
            General Information
          </Text>

          <Input
            label="Policy Name *"
            placeholder="e.g. Standard Field Rep Policy"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Description"
            placeholder="Brief explanation of policy coverage..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* =============================================================== */}
        {/* DYNAMIC SECTION BASED ON POLICY TYPE                            */}
        {/* =============================================================== */}

        {/* ATTENDANCE POLICY */}
        {type === 'ATTENDANCE' && (
          <>
            <Card style={styles.card} variant="outlined">
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 8 }]}>
                Punch In Evidence Requirements
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 16 }]}>
                Configure what verification items are required when clocking in.
              </Text>

              {STANDARD_FIELDS.map((f) => (
                <View key={`in_${f.key}`} style={styles.fieldRow}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>{f.label}</Text>
                  <SegmentedControl
                    options={[
                      { value: 'DISABLED', label: 'Off' },
                      { value: 'OPTIONAL', label: 'Opt' },
                      { value: 'REQUIRED', label: 'Req' },
                    ]}
                    value={punchInConfig[f.key] || 'DISABLED'}
                    onChange={(val) => handleConfigChange('in', f.key, val)}
                  />
                </View>
              ))}
            </Card>

            <Card style={styles.card} variant="outlined">
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 8 }]}>
                Punch Out Evidence Requirements
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 16 }]}>
                Configure what verification items are required when clocking out.
              </Text>

              {STANDARD_FIELDS.map((f) => (
                <View key={`out_${f.key}`} style={styles.fieldRow}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]}>{f.label}</Text>
                  <SegmentedControl
                    options={[
                      { value: 'DISABLED', label: 'Off' },
                      { value: 'OPTIONAL', label: 'Opt' },
                      { value: 'REQUIRED', label: 'Req' },
                    ]}
                    value={punchOutConfig[f.key] || 'DISABLED'}
                    onChange={(val) => handleConfigChange('out', f.key, val)}
                  />
                </View>
              ))}
            </Card>

            <Card style={styles.card} variant="outlined">
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
                Regularization & Corrections
              </Text>

              <View style={styles.switchRow}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Allow Regularization</Text>
                <Switch
                  value={allowRegularization}
                  onValueChange={setAllowRegularization}
                  trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                />
              </View>

              {allowRegularization && (
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Max Requests Per Month"
                    placeholder="e.g. 5"
                    value={maxRequestsPerMonth}
                    onChangeText={setMaxRequestsPerMonth}
                    keyboardType="numeric"
                  />
                  <Input
                    label="Request Window (Days)"
                    placeholder="e.g. 7"
                    value={regularizationWindowDays}
                    onChangeText={setRegularizationWindowDays}
                    keyboardType="numeric"
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </Card>
          </>
        )}

        {/* LEAVE POLICY */}
        {type === 'LEAVE' && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Leave Entitlements & Rules
            </Text>

            <Input
              label="Annual Leave Quota (Days / Year)"
              value={annualLeaveQuota}
              onChangeText={setAnnualLeaveQuota}
              keyboardType="numeric"
            />
            <Input
              label="Sick Leave Quota (Days / Year)"
              value={sickLeaveQuota}
              onChangeText={setSickLeaveQuota}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />
            <Input
              label="Casual Leave Quota (Days / Year)"
              value={casualLeaveQuota}
              onChangeText={setCasualLeaveQuota}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />
            <Input
              label="Max Consecutive Days"
              value={maxConsecutiveDays}
              onChangeText={setMaxConsecutiveDays}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />

            <View style={[styles.switchRow, { marginTop: 16 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Apply Sandwich Leave Rule</Text>
              <Switch
                value={allowSandwichLeaves}
                onValueChange={setAllowSandwichLeaves}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Allow Half-Day Leaves</Text>
              <Switch
                value={allowHalfDay}
                onValueChange={setAllowHalfDay}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>
          </Card>
        )}

        {/* EXPENSE POLICY */}
        {type === 'EXPENSE' && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Expense & Reimbursement Limits
            </Text>

            <Input
              label="Max Daily Claim ($)"
              value={maxDailyClaim}
              onChangeText={setMaxDailyClaim}
              keyboardType="numeric"
            />
            <Input
              label="Receipt Mandatory Above ($)"
              value={receiptMandatoryThreshold}
              onChangeText={setReceiptMandatoryThreshold}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />
            <Input
              label="Mileage Rate ($ / km)"
              value={mileageRatePerKm}
              onChangeText={setMileageRatePerKm}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />
            <Input
              label="Auto-Approval Limit ($)"
              value={autoApprovalLimit}
              onChangeText={setAutoApprovalLimit}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* TRACKING POLICY */}
        {type === 'TRACKING' && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              GPS & Live Tracking Rules
            </Text>

            <Input
              label="Location Sync Interval (Seconds)"
              value={trackingIntervalSeconds}
              onChangeText={setTrackingIntervalSeconds}
              keyboardType="numeric"
            />
            <Input
              label="Geofence Accuracy Radius (Meters)"
              value={geofenceRadiusMeters}
              onChangeText={setGeofenceRadiusMeters}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />

            <View style={[styles.switchRow, { marginTop: 16 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Track During Active Shift Only</Text>
              <Switch
                value={workingHoursOnly}
                onValueChange={setWorkingHoursOnly}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>High Accuracy GPS Mode</Text>
              <Switch
                value={highAccuracy}
                onValueChange={setHighAccuracy}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>
          </Card>
        )}

        {/* VISIT POLICY */}
        {type === 'VISIT' && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Customer Visit Rules
            </Text>

            <Input
              label="Max Allowed Proximity (Meters)"
              value={maxAllowedDistanceMeters}
              onChangeText={setMaxAllowedDistanceMeters}
              keyboardType="numeric"
            />
            <Input
              label="Minimum Visit Duration (Minutes)"
              value={minVisitDurationMinutes}
              onChangeText={setMinVisitDurationMinutes}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />

            <View style={[styles.switchRow, { marginTop: 16 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Mandatory Check-in Selfie</Text>
              <Switch
                value={requireCheckInSelfie}
                onValueChange={setRequireCheckInSelfie}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Mandatory Customer Signature</Text>
              <Switch
                value={requireSignature}
                onValueChange={setRequireSignature}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>
          </Card>
        )}

        {/* INSPECTION POLICY */}
        {type === 'INSPECTION' && (
          <Card style={styles.card} variant="outlined">
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              Inspection & Audit Criteria
            </Text>

            <Input
              label="Minimum Photos Required"
              value={minPhotosRequired}
              onChangeText={setMinPhotosRequired}
              keyboardType="numeric"
            />
            <Input
              label="Pass Threshold Score (%)"
              value={passThresholdScore}
              onChangeText={setPassThresholdScore}
              keyboardType="numeric"
              style={{ marginTop: 12 }}
            />

            <View style={[styles.switchRow, { marginTop: 16 }]}>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary }]}>Enforce 100% Checklist Completion</Text>
              <Switch
                value={requireChecklistCompletion}
                onValueChange={setRequireChecklistCompletion}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          label={isEdit ? 'Save Policy Changes' : 'Publish Policy'}
          onPress={handleSave}
          loading={createPolicy.isPending || updatePolicy.isPending}
          style={{ marginTop: 24, marginBottom: 40 }}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  scroll: { padding: 16 },
  card: { marginBottom: 16, padding: 16 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
