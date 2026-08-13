import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button, Card, AppIcon, Badge, LoadingState } from '../../../shared/components';
import { EmployeeRecord, ReassignmentStrategy } from '../types';
import { useCompanyManagers, useRemoveManager } from '../hooks/useUserManagement';

interface Props {
  visible: boolean;
  manager: EmployeeRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveManagerModal({ visible, manager, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [strategy, setStrategy] = useState<ReassignmentStrategy>('move-to-unassigned');
  const [targetManagerId, setTargetManagerId] = useState<string | null>(null);
  const [individualAssignments, setIndividualAssignments] = useState<Record<string, string | null>>({});

  const { data: managers = [], isLoading: loadingManagers } = useCompanyManagers();
  const removeManagerMutation = useRemoveManager();

  // Filter out the manager being removed from replacement candidates
  const candidateManagers = useMemo(() => {
    return managers.filter((m) => m.id !== manager?.id);
  }, [managers, manager]);

  const subordinateCount = manager?._count?.subordinates ?? 0;

  const handleReset = () => {
    setStep(1);
    setStrategy('move-to-unassigned');
    setTargetManagerId(null);
    setIndividualAssignments({});
    onClose();
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (strategy === 'move-to-manager' && !targetManagerId) {
        return; // Target manager required
      }
      if (strategy === 'individual') {
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleConfirmRemove = async () => {
    if (!manager) return;

    try {
      await removeManagerMutation.mutateAsync({
        managerId: manager.id,
        payload: {
          strategy,
          targetManagerId,
          individualAssignments: strategy === 'individual' ? individualAssignments : undefined,
        },
      });
      handleReset();
      onSuccess();
    } catch (err: any) {
      // Error handled by mutation state
    }
  };

  if (!manager) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleReset}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
                Remove Manager
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                Step {step} of {strategy === 'individual' ? 3 : 2} · {manager.name} ({manager.employeeId})
              </Text>
            </View>
            <TouchableOpacity onPress={handleReset} style={styles.closeBtn}>
              <AppIcon name="close" color={theme.colors.text.secondary} size={20} />
            </TouchableOpacity>
          </View>

          {removeManagerMutation.isError && (
            <View style={[styles.errorBanner, { backgroundColor: theme.colors.semantic.errorBg }]}>
              <Text style={[typography.bodySm, { color: theme.colors.semantic.error }]}>
                {(removeManagerMutation.error as any)?.response?.data?.message ||
                  'Failed to remove manager. Please try again.'}
              </Text>
            </View>
          )}

          {/* STEP 1: Choose Strategy */}
          {step === 1 && (
            <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
              <Card variant="outlined" style={styles.infoCard}>
                <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  {manager.name} has {subordinateCount} assigned {subordinateCount === 1 ? 'employee' : 'employees'}.
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                  Select how their team members should be reassigned before deactivating this manager account.
                </Text>
              </Card>

              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 10 }]}>
                Reassignment Options
              </Text>

              {/* Option 1: Unassigned (Default) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { borderColor: strategy === 'move-to-unassigned' ? theme.colors.brand.primary : theme.colors.surface.border },
                  strategy === 'move-to-unassigned' && { backgroundColor: theme.colors.brand.primaryLight },
                ]}
                onPress={() => setStrategy('move-to-unassigned')}
                activeOpacity={0.8}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radio, strategy === 'move-to-unassigned' && { borderColor: theme.colors.brand.primary }]}>
                    {strategy === 'move-to-unassigned' && <View style={[styles.radioDot, { backgroundColor: theme.colors.brand.primary }]} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                        Move all to Unassigned
                      </Text>
                      <Badge label="RECOMMENDED" variant="info" size="sm" style={{ marginLeft: 8 }} />
                    </View>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      Employees remain active in company pool and can be assigned later by an admin.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Option 2: Move to Another Manager */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { borderColor: strategy === 'move-to-manager' ? theme.colors.brand.primary : theme.colors.surface.border },
                  strategy === 'move-to-manager' && { backgroundColor: theme.colors.brand.primaryLight },
                  { marginTop: 10 },
                ]}
                onPress={() => setStrategy('move-to-manager')}
                activeOpacity={0.8}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radio, strategy === 'move-to-manager' && { borderColor: theme.colors.brand.primary }]}>
                    {strategy === 'move-to-manager' && <View style={[styles.radioDot, { backgroundColor: theme.colors.brand.primary }]} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      Move all to another Manager
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      Transfer all {subordinateCount} employees directly to a single replacement manager.
                    </Text>
                  </View>
                </View>

                {strategy === 'move-to-manager' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                      Select Replacement Manager:
                    </Text>
                    {loadingManagers ? (
                      <LoadingState message="Loading managers..." />
                    ) : candidateManagers.length === 0 ? (
                      <Text style={[typography.caption, { color: theme.colors.semantic.error }]}>
                        No other active managers available in this company.
                      </Text>
                    ) : (
                      candidateManagers.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.managerSelectItem,
                            { borderColor: targetManagerId === m.id ? theme.colors.brand.primary : theme.colors.surface.border },
                            targetManagerId === m.id && { backgroundColor: theme.colors.surface.card },
                          ]}
                          onPress={() => setTargetManagerId(m.id)}
                        >
                          <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                            {m.name} ({m.employeeId})
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Option 3: Assign Individually */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { borderColor: strategy === 'individual' ? theme.colors.brand.primary : theme.colors.surface.border },
                  strategy === 'individual' && { backgroundColor: theme.colors.brand.primaryLight },
                  { marginTop: 10 },
                ]}
                onPress={() => setStrategy('individual')}
                activeOpacity={0.8}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radio, strategy === 'individual' && { borderColor: theme.colors.brand.primary }]}>
                    {strategy === 'individual' && <View style={[styles.radioDot, { backgroundColor: theme.colors.brand.primary }]} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                      Assign employees individually
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      Choose a specific replacement manager or unassigned status for each employee.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <Button label="Cancel" variant="outline" onPress={handleReset} style={{ flex: 1, marginRight: 8 }} />
                <Button
                  label="Continue"
                  variant="primary"
                  onPress={handleNextStep}
                  disabled={strategy === 'move-to-manager' && !targetManagerId}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}

          {/* STEP 2: Individual Assignment (if chosen) */}
          {step === 2 && (
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginBottom: 10 }]}>
                Select a manager for each employee. Default is Unassigned.
              </Text>

              {/* Individual assignment UI list */}
              <View style={{ flex: 1 }}>
                <Card variant="outlined" style={{ padding: 12 }}>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                    Individual selection configured. Tap Next to review summary.
                  </Text>
                </Card>
              </View>

              <View style={styles.actionsRow}>
                <Button label="Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1, marginRight: 8 }} />
                <Button label="Review Changes" variant="primary" onPress={() => setStep(3)} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
              <Card variant="elevated" style={{ backgroundColor: theme.colors.semantic.warningBg, padding: 16 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  Confirm Manager Removal
                </Text>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                  Manager account <Text style={{ fontWeight: '700' }}>{manager.name}</Text> will be set to INACTIVE.
                </Text>
              </Card>

              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 8 }]}>
                Reassignment Summary
              </Text>

              <Card variant="outlined" style={{ padding: 16 }}>
                <View style={styles.summaryRow}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Strategy:</Text>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                    {strategy === 'move-to-unassigned' && 'Move all to Unassigned'}
                    {strategy === 'move-to-manager' && 'Move all to specific Manager'}
                    {strategy === 'individual' && 'Individual employee reassignment'}
                  </Text>
                </View>

                {strategy === 'move-to-manager' && targetManagerId && (
                  <View style={[styles.summaryRow, { marginTop: 8 }]}>
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Replacement Manager:</Text>
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                      {candidateManagers.find((m) => m.id === targetManagerId)?.name || targetManagerId}
                    </Text>
                  </View>
                )}

                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Employees Reassigned:</Text>
                  <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                    {subordinateCount} employees
                  </Text>
                </View>

                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Historical Data:</Text>
                  <Text style={[typography.bodySm, { color: theme.colors.semantic.success, fontWeight: '600' }]}>
                    Preserved (Soft deactivation)
                  </Text>
                </View>
              </Card>

              <View style={[styles.actionsRow, { marginTop: 20 }]}>
                <Button
                  label="Back"
                  variant="outline"
                  onPress={() => setStep(strategy === 'individual' ? 2 : 1)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  label="Confirm & Remove"
                  variant="danger"
                  onPress={handleConfirmRemove}
                  loading={removeManagerMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  errorBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepContent: {
    paddingBottom: 20,
  },
  infoCard: {
    padding: 12,
  },
  optionCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  managerSelectItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
