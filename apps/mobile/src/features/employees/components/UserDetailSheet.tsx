import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Avatar, Badge, Button, AppIcon, StatusBadge } from '../../../shared/components';
import { EmployeeRecord } from '../types';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';

interface Props {
  visible: boolean;
  user: EmployeeRecord | null;
  onClose: () => void;
  onDeactivate: (user: EmployeeRecord) => void;
  onActivate: (user: EmployeeRecord) => void;
  onRemoveManager: (user: EmployeeRecord) => void;
  onViewDetail: (user: EmployeeRecord) => void;
  onEditUser?: (user: EmployeeRecord) => void;
}

export function UserDetailSheet({
  visible,
  user,
  onClose,
  onDeactivate,
  onActivate,
  onRemoveManager,
  onViewDetail,
  onEditUser,
  onResetCredentials,
}: Props & { onResetCredentials?: (user: EmployeeRecord) => void }) {
  const theme = useTheme();
  const permissions = usePermissions();

  if (!user) return null;

  const isInactive = user.status === 'INACTIVE';
  const roleDisplay = ROLE_DISPLAY_LABELS[user.role as UserRole] || user.role;
  const isManagerRole = user.role === 'MANAGER';
  const isEmployeeRole = user.role === 'EMPLOYEE' || user.role === 'MANAGER' || user.role === 'HR';
  const canRemove = permissions.canRemoveUser(user.role, user.id);
  const canEdit = permissions.canEditUser(user.role, user.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: theme.colors.surface.card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Grab handle */}
          <View style={[styles.handle, { backgroundColor: theme.colors.surface.border }]} />

          {/* User Header */}
          <View style={styles.userHeader}>
            <Avatar name={user.name} size="md" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                {user.name}
              </Text>
              {!!(user.designation?.name) && (
                <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700', marginTop: 2 }]}>
                  💼 {user.designation.name}
                </Text>
              )}
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                {user.employeeId} · {user.email || 'No email registered'}
              </Text>
              {(user.phone || user.personalEmail || user.emergencyContactPhone) && (
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {user.phone ? `📱 ${user.phone}` : ''}
                  {user.phone && user.personalEmail ? ' · ' : ''}
                  {user.personalEmail ? `✉️ ${user.personalEmail}` : ''}
                </Text>
              )}
              {user.emergencyContactPhone && (
                <Text style={[typography.caption, { color: theme.colors.semantic.error, marginTop: 2, fontWeight: '600' }]}>
                  🆘 Emergency: {user.emergencyContactName ? `${user.emergencyContactName} (` : ''}{user.emergencyContactPhone}{user.emergencyContactName ? ')' : ''}
                </Text>
              )}
              {isEmployeeRole && (
                <Text style={[typography.caption, { marginTop: 3 }]}>
                  <Text style={{ color: theme.colors.text.secondary }}>Reporting to: </Text>
                  {user.manager?.name ? (
                    <Text style={{ color: theme.colors.brand.primary, fontWeight: '600' }}>
                      {user.manager.name}
                    </Text>
                  ) : (
                    <Text style={{ color: theme.colors.semantic.warning, fontWeight: '600' }}>
                      Unassigned
                    </Text>
                  )}
                </Text>
              )}
              <View style={styles.badgeRow}>
                <Badge label={`Role: ${roleDisplay}`} variant="info" size="sm" style={{ marginRight: 6 }} />
                <StatusBadge
                  status={isInactive ? 'offline' : 'active'}
                  label={isInactive ? 'Inactive' : 'Active'}
                  size="sm"
                />
              </View>
            </View>
          </View>

          {/* Action List */}
          <View style={styles.actionList}>
            {/* View Full Profile */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                onClose();
                onViewDetail(user);
              }}
            >
              <AppIcon name="profile" color={theme.colors.brand.primary} size={20} />
              <Text style={[typography.bodyMd, { color: theme.colors.text.primary, marginLeft: 12 }]}>
                View Full Profile & Activity
              </Text>
            </TouchableOpacity>

            {/* Edit User — Reassign Supervisor etc. */}
            {canEdit && onEditUser && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onEditUser(user);
                }}
              >
                <AppIcon name="document" color={theme.colors.brand.primary} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.brand.primary, marginLeft: 12, fontWeight: '600' }]}>
                  {user.role === 'SUPER_ADMIN' || user.role === 'MASTER_SUPER_ADMIN' || user.role === 'COMPANY_ADMIN'
                    ? 'Edit User Details'
                    : 'Edit User & Reassign Supervisor'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Reset Password & MPIN */}
            {canEdit && onResetCredentials && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onResetCredentials(user);
                }}
              >
                <AppIcon name="lock" color={theme.colors.brand.primary} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.brand.primary, marginLeft: 12, fontWeight: '600' }]}>
                  Reset Password & MPIN to Default
                </Text>
              </TouchableOpacity>
            )}

            {/* Manager Removal Workflow (for active managers) */}
            {canRemove && isManagerRole && !isInactive && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onRemoveManager(user);
                }}
              >
                <AppIcon name="employees" color={theme.colors.semantic.warning} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.semantic.warning, marginLeft: 12, fontWeight: '600' }]}>
                  Remove Manager (Reassign Employees)
                </Text>
              </TouchableOpacity>
            )}

            {/* Deactivate User */}
            {canRemove && !isInactive && !isManagerRole && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onDeactivate(user);
                }}
              >
                <AppIcon name="close" color={theme.colors.semantic.error} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.semantic.error, marginLeft: 12 }]}>
                  Deactivate User Account
                </Text>
              </TouchableOpacity>
            )}

            {/* Reactivate User */}
            {canRemove && isInactive && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onActivate(user);
                }}
              >
                <AppIcon name="success" color={theme.colors.semantic.success} size={20} />
                <Text style={[typography.bodyMd, { color: theme.colors.semantic.success, marginLeft: 12 }]}>
                  Reactivate User Account
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button label="Cancel" variant="outline" onPress={onClose} fullWidth style={{ marginTop: 16 }} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  actionList: {
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
