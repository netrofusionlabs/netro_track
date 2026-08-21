import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { Card, Input, Button, AppIcon, Badge, SegmentedControl } from '../../shared/components';
import { useSubmitRegularization, useEffectiveAttendancePolicy, useRegularizations } from './hooks/useAttendance';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';

export function NewRegularizationScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { data: policy, isLoading: loadingPolicy } = useEffectiveAttendancePolicy();
  const submitRegularization = useSubmitRegularization();
  const { data: requests, isLoading: loadingHistory, refetch: refetchHistory } = useRegularizations();

  // Tab state
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

  useRefreshOnFocus(refetchHistory);

  // Form states
  const [date, setDate] = useState(() => route?.params?.date || new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [punchInTime, setPunchInTime] = useState(() => {
    const existing = route?.params?.existingPunchIn;
    if (existing) {
      const d = new Date(existing);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '09:00';
  });
  const [punchOutTime, setPunchOutTime] = useState(() => {
    const existing = route?.params?.existingPunchOut;
    if (existing) {
      const d = new Date(existing);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '18:00';
  });
  const [reason, setReason] = useState('');
  const [punchInOdometer, setPunchInOdometer] = useState(() => {
    const existing = route?.params?.existingPunchInOdometer;
    return existing != null ? String(existing) : '';
  });
  const [punchOutOdometer, setPunchOutOdometer] = useState(() => {
    const existing = route?.params?.existingPunchOutOdometer;
    return existing != null ? String(existing) : '';
  });
  const [includePunchIn, setIncludePunchIn] = useState(true);
  const [includePunchOut, setIncludePunchOut] = useState(true);

  // Update form states if params change (important when user clicks Regularize on different logs)
  useEffect(() => {
    if (route?.params?.date) {
      setDate(route.params.date);
    }
    if (route?.params?.existingPunchIn) {
      const d = new Date(route.params.existingPunchIn);
      setPunchInTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setPunchInTime('09:00');
    }
    if (route?.params?.existingPunchOut) {
      const d = new Date(route.params.existingPunchOut);
      setPunchOutTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setPunchOutTime('18:00');
    }
    const inOdo = route?.params?.existingPunchInOdometer;
    setPunchInOdometer(inOdo != null ? String(inOdo) : '');
    const outOdo = route?.params?.existingPunchOutOdometer;
    setPunchOutOdometer(outOdo != null ? String(outOdo) : '');
    
    // Default tab to request when routed with specific parameters
    if (route?.params) {
      setActiveTab('request');
    }
  }, [route?.params]);

  const regConfig = policy?.regularizationConfig || {
    allowRegularization: true,
    allowMissedPunch: true,
    allowTimeCorrection: true,
    maxRequestsPerMonth: 5,
    regularizationWindowDays: 7,
  };

  const needsInOdometer = includePunchIn && policy?.punchInConfig?.vehicleMeter === 'REQUIRED';
  const needsOutOdometer = includePunchOut && policy?.punchOutConfig?.vehicleMeter === 'REQUIRED';

  const handleSubmit = async () => {
    if (!regConfig.allowRegularization) {
      Alert.alert('Blocked', 'Attendance regularization is disabled by policy.');
      return;
    }

    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Validation Error', 'Please enter date in YYYY-MM-DD format.');
      return;
    }

    if (!includePunchIn && !includePunchOut) {
      Alert.alert('Validation Error', 'Please select at least one punch time (Punch In or Punch Out) to regularize.');
      return;
    }

    if (includePunchIn && !punchInTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Validation Error', 'Please enter punch-in time in HH:MM format.');
      return;
    }

    if (includePunchOut && !punchOutTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Validation Error', 'Please enter punch-out time in HH:MM format.');
      return;
    }

    if (needsInOdometer && !punchInOdometer.trim()) {
      Alert.alert('Validation Error', 'Punch In odometer reading is required by your attendance policy.');
      return;
    }

    if (needsOutOdometer && !punchOutOdometer.trim()) {
      Alert.alert('Validation Error', 'Punch Out odometer reading is required by your attendance policy.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a detailed reason for regularization.');
      return;
    }

    // Verify window limit client-side
    const targetDate = new Date(date);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffTime = startOfToday.getTime() - startOfTarget.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > regConfig.regularizationWindowDays) {
      Alert.alert(
        'Limit Exceeded',
        `You can only request regularization within ${regConfig.regularizationWindowDays} days of the target date.`
      );
      return;
    }

    try {
      const requestedPunchIn = includePunchIn ? `${date}T${punchInTime}:00.000Z` : null;
      const requestedPunchOut = includePunchOut ? `${date}T${punchOutTime}:00.000Z` : null;

      await submitRegularization.mutateAsync({
        date,
        requestedPunchIn,
        requestedPunchOut,
        requestedPunchInOdometer: needsInOdometer ? Number(punchInOdometer) : null,
        requestedPunchOutOdometer: needsOutOdometer ? Number(punchOutOdometer) : null,
        reason: reason.trim(),
      });

      Alert.alert('Success', 'Regularization request submitted successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit regularization request.';
      Alert.alert('Error', msg);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeLabel = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getStatusBadge = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    switch (status) {
      case 'APPROVED':
        return <Badge label="Approved" variant="success" size="sm" />;
      case 'REJECTED':
        return <Badge label="Rejected" variant="error" size="sm" />;
      default:
        return <Badge label="Pending" variant="info" size="sm" />;
    }
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const isMissedPunch = !item.originalPunchIn && !item.originalPunchOut;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {formatDateLabel(item.date)}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
              {isMissedPunch ? '➕ Missed Punch Request' : '✏️ Time Correction Request'}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={[styles.detailsBox, { backgroundColor: theme.colors.surface.subtle }]}>
          <View style={styles.column}>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '700' }]}>
              Original Punches
            </Text>
            <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 4 }]}>
              📥 In: {formatTimeLabel(item.originalPunchIn)}
            </Text>
            {item.originalPunchInOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 16 }]}>
                🚗 Meter: {item.originalPunchInOdometer}
              </Text>
            )}
            <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 2 }]}>
              📤 Out: {formatTimeLabel(item.originalPunchOut)}
            </Text>
            {item.originalPunchOutOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 16 }]}>
                🚗 Meter: {item.originalPunchOutOdometer}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.surface.border }]} />

          <View style={styles.column}>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '700' }]}>
              Requested Punches
            </Text>
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, marginTop: 4, fontWeight: '600' }]}>
              📥 In: {formatTimeLabel(item.requestedPunchIn)}
            </Text>
            {item.requestedPunchInOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 16, fontWeight: '600' }]}>
                🚗 Meter: {item.requestedPunchInOdometer}
              </Text>
            )}
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, marginTop: 2, fontWeight: '600' }]}>
              📤 Out: {formatTimeLabel(item.requestedPunchOut)}
            </Text>
            {item.requestedPunchOutOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 16, fontWeight: '600' }]}>
                🚗 Meter: {item.requestedPunchOutOdometer}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.reasonBox}>
          <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
            Reason:
          </Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 2 }]}>
            {item.reason}
          </Text>
        </View>

        {item.remarks && (
          <View style={[styles.remarksBox, { borderLeftColor: theme.colors.brand.primary }]}>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '600' }]}>
              Manager Remarks:
            </Text>
            <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 2, fontStyle: 'italic' }]}>
              "{item.remarks}"
            </Text>
            {item.approver && (
              <Text style={[typography.caption, { color: theme.colors.text.tertiary, marginTop: 4, textAlign: 'right' }]}>
                Reviewed by {item.approver.name}
              </Text>
            )}
          </View>
        )}
      </Card>
    );
  };

  if (loadingPolicy) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.surface.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
            Attendance Regularization
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Tabs Control */}
        <SegmentedControl
          options={[
            { value: 'request', label: 'Submit Request' },
            { value: 'history', label: 'Request Logs' },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'request' | 'history')}
          style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}
        />

        {activeTab === 'request' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!regConfig.allowRegularization ? (
              <Card style={styles.formCard}>
                <Text style={[typography.bodyMd, { color: theme.colors.semantic.error, textAlign: 'center' }]}>
                  Attendance Regularization is disabled for your account. Please contact your administrator.
                </Text>
              </Card>
            ) : (
              <Card variant="elevated" style={styles.formCard}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
                  Request Details
                </Text>

                {/* Date Input */}
                <Input
                  label="Date of Missed Shift (YYYY-MM-DD) *"
                  value={date}
                  onChangeText={setDate}
                  placeholder="e.g. 2026-08-18"
                />

                {/* Checkboxes/toggles for custom times */}
                <View style={styles.togglesContainer}>
                  {regConfig.allowTimeCorrection && (
                    <Button
                      variant={includePunchIn ? 'primary' : 'outline'}
                      label="Punch In"
                      size="sm"
                      onPress={() => setIncludePunchIn(!includePunchIn)}
                      style={styles.toggleButton}
                    />
                  )}
                  {regConfig.allowTimeCorrection && (
                    <Button
                      variant={includePunchOut ? 'primary' : 'outline'}
                      label="Punch Out"
                      size="sm"
                      onPress={() => setIncludePunchOut(!includePunchOut)}
                      style={styles.toggleButton}
                    />
                  )}
                </View>

                {/* Punch In Time */}
                {includePunchIn && (
                  <Input
                    label="Requested Punch In Time (24h HH:MM) *"
                    value={punchInTime}
                    onChangeText={setPunchInTime}
                    placeholder="e.g. 09:00"
                  />
                )}

                {/* Punch Out Time */}
                {includePunchOut && (
                  <Input
                    label="Requested Punch Out Time (24h HH:MM) *"
                    value={punchOutTime}
                    onChangeText={setPunchOutTime}
                    placeholder="e.g. 18:00"
                  />
                )}

                {/* Manual Odometer Input if required by policy */}
                {needsInOdometer && (
                  <Input
                    label="Vehicle Odometer Reading (Punch In) *"
                    value={punchInOdometer}
                    onChangeText={setPunchInOdometer}
                    keyboardType="numeric"
                    placeholder="e.g. 45290"
                  />
                )}

                {needsOutOdometer && (
                  <Input
                    label="Vehicle Odometer Reading (Punch Out) *"
                    value={punchOutOdometer}
                    onChangeText={setPunchOutOdometer}
                    keyboardType="numeric"
                    placeholder="e.g. 45310"
                  />
                )}

                {/* Reason */}
                <Input
                  label="Reason for Regularization *"
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Explain why you missed or need to correct this punch..."
                  multiline
                  numberOfLines={4}
                />

                <View style={{ marginTop: 16 }}>
                  {submitRegularization.isPending ? (
                    <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                  ) : (
                    <Button
                      label="Submit Request"
                      onPress={handleSubmit}
                      variant="primary"
                      fullWidth
                      size="lg"
                    />
                  )}
                </View>
              </Card>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {loadingHistory ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.brand.primary} />
              </View>
            ) : (
              <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <AppIcon name="attendance" color={theme.colors.text.tertiary} size={48} />
                    <Text style={[typography.bodyMd, { color: theme.colors.text.secondary, marginTop: 12 }]}>
                      No regularization requests found.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 0,
    width: 40,
    alignItems: 'flex-start',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    padding: 16,
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailsBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '80%',
    marginHorizontal: 16,
  },
  reasonBox: {
    marginBottom: 10,
  },
  remarksBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});
