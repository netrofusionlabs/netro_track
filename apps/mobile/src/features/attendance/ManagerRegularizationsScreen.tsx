import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import { Card, Badge, AppIcon, Button, Input } from '../../shared/components';
import {
  useRegularizations,
  useReviewRegularization,
  useBulkReviewRegularizations,
} from './hooks/useAttendance';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';

export function ManagerRegularizationsScreen({ navigation }: any) {
  const theme = useTheme();

  // Tab state: 'pending' or 'history'
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Multi-select state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal / Review state for single actions
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [remarks, setRemarks] = useState('');
  const [bulkRemarks, setBulkRemarks] = useState('');

  // Fetch pending and historical requests
  const { data: pendingRequests, isLoading: loadingPending, refetch: refetchPending } = useRegularizations('PENDING');
  const { data: approvedRequests, isLoading: loadingApproved, refetch: refetchApproved } = useRegularizations('APPROVED');
  const { data: rejectedRequests, isLoading: loadingRejected, refetch: refetchRejected } = useRegularizations('REJECTED');

  const reviewRequest = useReviewRegularization();
  const bulkReviewRequests = useBulkReviewRegularizations();

  const refetchAll = () => {
    void refetchPending();
    void refetchApproved();
    void refetchRejected();
  };

  useRefreshOnFocus(refetchAll);

  const historyRequests = [...(approvedRequests || []), ...(rejectedRequests || [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSingleReview = async (action: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;

    try {
      await reviewRequest.mutateAsync({
        id: selectedRequest.id,
        action,
        remarks: remarks.trim() || null,
      });

      Alert.alert('Success', `Request has been ${action.toLowerCase()} successfully.`);
      setSelectedRequest(null);
      setRemarks('');
      refetchAll();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to review request.';
      Alert.alert('Error', msg);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Bulk Approval',
      `Are you sure you want to approve ${selectedIds.length} selected requests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              await bulkReviewRequests.mutateAsync({
                ids: selectedIds,
                action: 'APPROVED',
                remarks: bulkRemarks.trim() || null,
              });

              Alert.alert('Success', `Approved ${selectedIds.length} requests successfully.`);
              setSelectedIds([]);
              setBulkRemarks('');
              refetchAll();
            } catch (err: any) {
              const msg = err?.response?.data?.message || 'Failed to perform bulk approval.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.status === 'PENDING';
    const isChecked = selectedIds.includes(item.id);

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          {isPending && (
            <TouchableOpacity
              onPress={() => toggleSelect(item.id)}
              style={[
                styles.checkbox,
                {
                  borderColor: isChecked ? theme.colors.brand.primary : theme.colors.surface.border,
                  backgroundColor: isChecked ? theme.colors.brand.primary : 'transparent',
                },
              ]}
            >
              {isChecked && <AppIcon name="success" color="#FFFFFF" size={12} />}
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, marginLeft: isPending ? 10 : 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {item.user.name}
              </Text>
              {!isPending && (
                <Badge
                  label={item.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  variant={item.status === 'APPROVED' ? 'success' : 'error'}
                  size="sm"
                />
              )}
            </View>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
              Emp ID: {item.user.employeeId} · {formatDate(item.date)}
            </Text>
          </View>
        </View>

        <View style={[styles.detailsBox, { backgroundColor: theme.colors.surface.subtle }]}>
          <View style={styles.column}>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '700' }]}>
              Original
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.primary, marginTop: 2 }]}>
              In: {formatTime(item.originalPunchIn)}
            </Text>
            {item.originalPunchInOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8, fontSize: 10 }]}>
                🚗 Meter: {item.originalPunchInOdometer}
              </Text>
            )}
            <Text style={[typography.caption, { color: theme.colors.text.primary, marginTop: 1 }]}>
              Out: {formatTime(item.originalPunchOut)}
            </Text>
            {item.originalPunchOutOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8, fontSize: 10 }]}>
                🚗 Meter: {item.originalPunchOutOdometer}
              </Text>
            )}
          </View>
          <View style={styles.column}>
            <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
              Requested
            </Text>
            <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 2, fontWeight: '600' }]}>
              In: {formatTime(item.requestedPunchIn)}
            </Text>
            {item.requestedPunchInOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 8, fontWeight: '600', fontSize: 10 }]}>
                🚗 Meter: {item.requestedPunchInOdometer}
              </Text>
            )}
            <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 1, fontWeight: '600' }]}>
              Out: {formatTime(item.requestedPunchOut)}
            </Text>
            {item.requestedPunchOutOdometer != null && (
              <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 8, fontWeight: '600', fontSize: 10 }]}>
                🚗 Meter: {item.requestedPunchOutOdometer}
              </Text>
            )}
          </View>
        </View>

        <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 6 }]}>
          <Text style={{ fontWeight: '600' }}>Reason: </Text>
          {item.reason}
        </Text>

        {isPending ? (
          <Button
            label="Review Request"
            variant="outline"
            size="sm"
            onPress={() => setSelectedRequest(item)}
            style={{ marginTop: 10 }}
          />
        ) : (
          item.remarks && (
            <View style={[styles.remarksBox, { borderLeftColor: theme.colors.brand.primary }]}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                Remarks: "{item.remarks}"
              </Text>
            </View>
          )
        )}
      </Card>
    );
  };

  const isListLoading = loadingPending || loadingApproved || loadingRejected;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevronLeft" color={theme.colors.text.primary} size={24} />
        </TouchableOpacity>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>
          Regularization Center
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.surface.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && { borderBottomColor: theme.colors.brand.primary }]}
          onPress={() => {
            setActiveTab('pending');
            setSelectedIds([]);
          }}
        >
          <Text
            style={[
              typography.buttonSm,
              { color: activeTab === 'pending' ? theme.colors.brand.primary : theme.colors.text.secondary },
            ]}
          >
            Pending ({pendingRequests?.length ?? 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && { borderBottomColor: theme.colors.brand.primary }]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              typography.buttonSm,
              { color: activeTab === 'history' ? theme.colors.brand.primary : theme.colors.text.secondary },
            ]}
          >
            History ({historyRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isListLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'pending' ? pendingRequests : historyRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AppIcon name="attendance" color={theme.colors.text.tertiary} size={48} />
              <Text style={[typography.bodyMd, { color: theme.colors.text.secondary, marginTop: 12 }]}>
                No requests found.
              </Text>
            </View>
          }
        />
      )}

      {/* Bulk Approval Actions Footer Bar */}
      {activeTab === 'pending' && selectedIds.length > 0 && (
        <View style={[styles.bulkFooter, { backgroundColor: theme.colors.surface.card, borderTopColor: theme.colors.surface.border }]}>
          <Input
            value={bulkRemarks}
            onChangeText={setBulkRemarks}
            placeholder="Add common approval comments..."
            style={styles.bulkInput}
          />
          <Button
            label={`Bulk Approve (${selectedIds.length})`}
            variant="primary"
            size="md"
            onPress={handleBulkApprove}
            disabled={bulkReviewRequests.isPending}
          />
        </View>
      )}

      {/* Single Review Modal */}
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Review Regularization Request
            </Text>

            {selectedRequest && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  {selectedRequest.user.name} (Emp ID: {selectedRequest.user.employeeId})
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                  Shift Date: {formatDate(selectedRequest.date)}
                </Text>

                <View style={[styles.detailsBox, { backgroundColor: theme.colors.surface.subtle, marginTop: 10 }]}>
                  <View style={styles.column}>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '700' }]}>
                      Original Punches
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.primary, marginTop: 2 }]}>
                      In: {formatTime(selectedRequest.originalPunchIn)}
                    </Text>
                    {selectedRequest.originalPunchInOdometer != null && (
                      <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8, fontSize: 10 }]}>
                        🚗 Meter: {selectedRequest.originalPunchInOdometer}
                      </Text>
                    )}
                    <Text style={[typography.caption, { color: theme.colors.text.primary, marginTop: 1 }]}>
                      Out: {formatTime(selectedRequest.originalPunchOut)}
                    </Text>
                    {selectedRequest.originalPunchOutOdometer != null && (
                      <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8, fontSize: 10 }]}>
                        🚗 Meter: {selectedRequest.originalPunchOutOdometer}
                      </Text>
                    )}
                  </View>
                  <View style={styles.column}>
                    <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                      Requested Punches
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 2, fontWeight: '600' }]}>
                      In: {formatTime(selectedRequest.requestedPunchIn)}
                    </Text>
                    {selectedRequest.requestedPunchInOdometer != null && (
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 8, fontWeight: '600', fontSize: 10 }]}>
                        🚗 Meter: {selectedRequest.requestedPunchInOdometer}
                      </Text>
                    )}
                    <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                      Out: {formatTime(selectedRequest.requestedPunchOut)}
                    </Text>
                    {selectedRequest.requestedPunchOutOdometer != null && (
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, marginLeft: 8, fontWeight: '600', fontSize: 10 }]}>
                        🚗 Meter: {selectedRequest.requestedPunchOutOdometer}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={[typography.bodySm, { color: theme.colors.text.primary, marginTop: 8 }]}>
                  <Text style={{ fontWeight: '600' }}>Reason: </Text>
                  {selectedRequest.reason}
                </Text>
              </View>
            )}

            <Input
              label="Auditor Remarks / Reason *"
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. Approved based on team sync details / Rejected due to lack of proof..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                label="Reject"
                variant="outline"
                size="md"
                onPress={() => handleSingleReview('REJECTED')}
                style={{ flex: 1, borderColor: theme.colors.semantic.error }}
                disabled={reviewRequest.isPending}
              />
              <Button
                label="Approve"
                variant="primary"
                size="md"
                onPress={() => handleSingleReview('APPROVED')}
                style={{ flex: 1 }}
                disabled={reviewRequest.isPending}
              />
            </View>
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              onPress={() => {
                setSelectedRequest(null);
                setRemarks('');
              }}
              style={{ marginTop: 10 }}
            />
          </Card>
        </View>
      </Modal>
    </View>
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
    width: 40,
    alignItems: 'flex-start',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsBox: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    gap: 16,
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  remarksBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  bulkFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
  },
  bulkInput: {
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    padding: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
