import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { ScreenHeader, Button, Card } from '../../../shared/components';
import { typography } from '../../../shared/theme/typography';
import { api } from '../../../shared/services/api';
import { useAuthStore } from '../../auth/stores/authStore';
import { AppIcon } from '../../../shared/components/AppIcon';

// ── Types ────────────────────────────────────────────────────────────────────

interface CapabilityItem {
  id: string;
  key: string;
  slug: string;
  name: string;
  description?: string;
  type: 'MODULE' | 'FEATURE' | 'ACTION';
  parentId?: string | null;
  sortOrder: number;
}

interface AccessGroupItem {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userMembers: number;
    permissions: number;
  };
}

interface AccessGroupDetail extends AccessGroupItem {
  permissions: Array<{
    capabilityId: string;
    capability: CapabilityItem;
  }>;
  userMembers: Array<{
    user: {
      id: string;
      name: string;
      employeeId: string;
      email?: string | null;
      role: string;
    };
  }>;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface GroupedModule {
  moduleKey: string;
  moduleName: string;
  actions: CapabilityItem[];
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function AccessGroupsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER_SUPER_ADMIN';

  // Data
  const [groups, setGroups] = useState<AccessGroupItem[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccessGroupDetail | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedCapIds, setSelectedCapIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Company picker for super admins
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  // ── API helpers ──────────────────────────────────────────────────────────

  const companyQuery = useCallback((): string => {
    return isSuperAdmin && selectedCompanyId
      ? `?companyId=${selectedCompanyId}`
      : '';
  }, [isSuperAdmin, selectedCompanyId]);

  const loadCompanies = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get('/companies');
      const list = res.data?.data || res.data || [];
      setCompanies(Array.isArray(list) ? list : []);
    } catch {
      setCompanies([]);
    }
  }, [isSuperAdmin]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await api.get(`/authorization/access-groups${companyQuery()}`);
      const data = res.data?.data || res.data || [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Failed to load access groups';
      Alert.alert('Error', message);
    }
  }, [companyQuery]);

  const loadCapabilities = useCallback(async () => {
    try {
      const res = await api.get(`/authorization/available-capabilities${companyQuery()}`);
      const data = res.data?.data || res.data || [];
      setCapabilities(Array.isArray(data) ? data : []);
    } catch {
      setCapabilities([]);
    }
  }, [companyQuery]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGroups(), loadCapabilities()]);
    setLoading(false);
  }, [loadGroups, loadCapabilities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGroups(), loadCapabilities()]);
    setRefreshing(false);
  }, [loadGroups, loadCapabilities]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Grouped capabilities ─────────────────────────────────────────────────

  const groupedCapabilities: GroupedModule[] = useMemo(() => {
    const actionCaps = capabilities.filter((c) => c.type === 'ACTION');
    const moduleMap = new Map<string, { moduleName: string; actions: CapabilityItem[] }>();

    for (const action of actionCaps) {
      const parts = action.slug.split('.');
      const moduleKey = parts[0] || 'general';
      const moduleName =
        moduleKey.charAt(0).toUpperCase() +
        moduleKey.slice(1).replace(/_/g, ' ');

      if (!moduleMap.has(moduleKey)) {
        moduleMap.set(moduleKey, { moduleName, actions: [] });
      }
      moduleMap.get(moduleKey)!.actions.push(action);
    }

    return Array.from(moduleMap.entries()).map(([moduleKey, data]) => ({
      moduleKey,
      moduleName: data.moduleName,
      actions: data.actions.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [capabilities]);

  // ── Filtered groups ──────────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)),
    );
  }, [groups, searchQuery]);

  // ── Metrics ──────────────────────────────────────────────────────────────

  const totalGroups = groups.length;
  const systemCount = groups.filter((g) => g.isSystem).length;
  const customCount = groups.filter((g) => !g.isSystem).length;
  const activeCount = groups.filter((g) => g.isActive).length;

  // ── Drawer / Modal handlers ──────────────────────────────────────────────

  const openCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setSelectedCapIds(new Set());
    setModalVisible(true);
  };

  const openEdit = async (group: AccessGroupItem) => {
    try {
      const res = await api.get<{ data: AccessGroupDetail }>(
        `/authorization/access-groups/${group.id}${companyQuery()}`,
      );
      const detail = res.data?.data || (res.data as unknown as AccessGroupDetail);
      setEditingGroup(detail);
      setFormName(detail.name);
      setFormDescription(detail.description || '');
      setFormIsActive(detail.isActive);
      const capIds = new Set(
        (detail.permissions || []).map((p) => p.capabilityId),
      );
      setSelectedCapIds(capIds);
      setModalVisible(true);
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Failed to load group details';
      Alert.alert('Error', message);
    }
  };

  const toggleCapability = (capId: string) => {
    setSelectedCapIds((prev) => {
      const next = new Set(prev);
      if (next.has(capId)) {
        next.delete(capId);
      } else {
        next.add(capId);
      }
      return next;
    });
  };

  const toggleModuleAll = (actions: CapabilityItem[]) => {
    setSelectedCapIds((prev) => {
      const next = new Set(prev);
      const allSelected = actions.every((a) => next.has(a.id));
      if (allSelected) {
        for (const a of actions) next.delete(a.id);
      } else {
        for (const a of actions) next.add(a.id);
      }
      return next;
    });
  };

  const saveGroup = async () => {
    const name = formName.trim();
    if (!name) {
      Alert.alert('Validation', 'Access Group name is required.');
      return;
    }
    const capabilityIds = Array.from(selectedCapIds);
    if (capabilityIds.length === 0) {
      Alert.alert('Validation', 'Please select at least one capability.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
        capabilityIds,
      };

      if (isSuperAdmin && selectedCompanyId) {
        payload.companyId = selectedCompanyId;
      }

      if (editingGroup) {
        await api.put(`/authorization/access-groups/${editingGroup.id}`, payload);
        Alert.alert('Success', 'Access Group updated successfully.');
      } else {
        await api.post('/authorization/access-groups', payload);
        Alert.alert('Success', 'Access Group created successfully.');
      }
      setModalVisible(false);
      loadAll();
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Failed to save access group';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = (group: AccessGroupItem) => {
    if (group.isSystem) {
      Alert.alert('Cannot Delete', 'System default access groups cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Access Group',
      `Are you sure you want to delete "${group.name}"? Users assigned exclusively to this group will lose these permissions immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const q = companyQuery();
              await api.delete(`/authorization/access-groups/${group.id}${q}`);
              Alert.alert('Success', 'Access Group deleted.');
              loadAll();
            } catch (err: unknown) {
              const message = (err as any)?.response?.data?.message || 'Failed to delete';
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  };

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return 'Own Company';
    return companies.find((c) => c.id === selectedCompanyId)?.name || 'Selected Company';
  }, [selectedCompanyId, companies]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader title="Access Groups & Permissions" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Company Selector for Super Admins */}
        {isSuperAdmin && (
          <View style={[styles.companyBar, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
            <AppIcon name="building" size={16} color={theme.colors.brand.primary} />
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, fontWeight: '600' }]}>
              Company:
            </Text>
            <TouchableOpacity
              style={[styles.companyPicker, { borderColor: theme.colors.surface.border }]}
              onPress={() => setShowCompanyPicker(true)}
            >
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                {selectedCompanyName}
              </Text>
              <AppIcon name="chevronDown" size={12} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Metrics */}
        <View style={styles.metricsRow}>
          {[
            { label: 'Total', value: totalGroups, color: theme.colors.brand.primary },
            { label: 'System', value: systemCount, color: theme.colors.text.secondary },
            { label: 'Custom', value: customCount, color: theme.colors.semantic.warning },
            { label: 'Active', value: activeCount, color: theme.colors.semantic.success },
          ].map((m) => (
            <View key={m.label} style={[styles.metricCard, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
              <Text style={[typography.headingMd, { color: m.color }]}>{m.value}</Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
          <AppIcon name="search" size={16} color={theme.colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Search access groups..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="close" size={14} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 12 }]}>
              Loading access groups...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredGroups.length === 0 && (
          <View style={styles.centered}>
            <AppIcon name="lock" size={40} color={theme.colors.text.tertiary} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 12 }]}>
              {searchQuery ? 'No matching groups' : 'No Access Groups Found'}
            </Text>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }]}>
              {searchQuery
                ? 'Try widening your search terms.'
                : 'Create your first access group to assign permissions to employees.'}
            </Text>
          </View>
        )}

        {/* Groups List */}
        {!loading &&
          filteredGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.groupCard, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}
              onPress={() => openEdit(group)}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.groupTitleRow}>
                    <Text style={[typography.bodyMd, { fontWeight: '600', color: theme.colors.text.primary }]}>
                      {group.name}
                    </Text>
                    {group.isSystem && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.surface.subtle }]}>
                        <Text style={[typography.caption, { color: theme.colors.brand.primary, fontSize: 10 }]}>
                          SYSTEM
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: group.isActive ? theme.colors.semantic.success : theme.colors.text.tertiary },
                      ]}
                    />
                  </View>
                  {group.description ? (
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
                      {group.description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => deleteGroup(group)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={group.isSystem}
                  style={{ opacity: group.isSystem ? 0.3 : 1 }}
                >
                  <AppIcon name="trash" size={16} color={theme.colors.semantic.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.groupMeta}>
                <View style={styles.metaItem}>
                  <AppIcon name="employees" size={13} color={theme.colors.text.tertiary} />
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                    {group._count?.userMembers || 0} Users
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <AppIcon name="lock" size={13} color={theme.colors.text.tertiary} />
                  <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                    {group._count?.permissions || 0} Capabilities
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* FAB: Create */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.brand.primary }]}
        onPress={openCreate}
        activeOpacity={0.85}
      >
        <AppIcon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Company Picker Modal ─────────────────────────────────────────────── */}
      <Modal visible={showCompanyPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.surface.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                Select Company
              </Text>
              <TouchableOpacity onPress={() => setShowCompanyPicker(false)}>
                <AppIcon name="close" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity
                style={[styles.pickerItem, selectedCompanyId === '' && styles.pickerItemSelected]}
                onPress={() => {
                  setSelectedCompanyId('');
                  setShowCompanyPicker(false);
                }}
              >
                <Text style={[typography.bodyMd, { color: theme.colors.text.primary }]}>
                  — Own Company (Default) —
                </Text>
                {selectedCompanyId === '' && (
                  <AppIcon name="checkCircle" size={16} color={theme.colors.brand.primary} />
                )}
              </TouchableOpacity>
              {companies.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerItem, selectedCompanyId === c.id && styles.pickerItemSelected]}
                  onPress={() => {
                    setSelectedCompanyId(c.id);
                    setShowCompanyPicker(false);
                  }}
                >
                  <Text style={[typography.bodyMd, { color: theme.colors.text.primary }]}>
                    {c.name}
                  </Text>
                  {selectedCompanyId === c.id && (
                    <AppIcon name="checkCircle" size={16} color={theme.colors.brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
          <ScreenHeader
            title={editingGroup ? 'Edit Access Group' : 'Create Access Group'}
            onBackPress={() => setModalVisible(false)}
          />
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Group Name */}
            <View style={[styles.formSection, { marginHorizontal: 16 }]}>
              <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                Access Group Name <Text style={{ color: theme.colors.semantic.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border, color: theme.colors.text.primary }]}
                placeholder="e.g. Field Supervisor, Regional Auditor"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            {/* Description */}
            <View style={[styles.formSection, { marginHorizontal: 16 }]}>
              <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
                Description
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border, color: theme.colors.text.primary }]}
                placeholder="Brief description of this access profile..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Active Toggle */}
            <View style={[styles.toggleRow, { marginHorizontal: 16, backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  Active
                </Text>
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                  Enable this group for user assignment
                </Text>
              </View>
              <Switch
                value={formIsActive}
                onValueChange={setFormIsActive}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>

            {/* Capability Selection */}
            <View style={{ marginTop: 16, marginHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  Capabilities
                </Text>
                <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                  {selectedCapIds.size} Selected
                </Text>
              </View>

              {groupedCapabilities.length === 0 && (
                <View style={[styles.emptyCapNotice, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
                  <AppIcon name="info" size={16} color={theme.colors.text.tertiary} />
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginLeft: 8, flex: 1 }]}>
                    No capabilities entitled for this company. Ensure platform capabilities are created and entitled.
                  </Text>
                </View>
              )}

              {groupedCapabilities.map((mod) => {
                const allSelected = mod.actions.every((a) => selectedCapIds.has(a.id));
                const someSelected = mod.actions.some((a) => selectedCapIds.has(a.id));

                return (
                  <View
                    key={mod.moduleKey}
                    style={[styles.moduleCard, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}
                  >
                    {/* Module Header */}
                    <TouchableOpacity
                      style={styles.moduleHeader}
                      onPress={() => toggleModuleAll(mod.actions)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.moduleCheck}>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: allSelected || someSelected
                                ? theme.colors.brand.primary
                                : theme.colors.surface.border,
                              backgroundColor: allSelected
                                ? theme.colors.brand.primary
                                : 'transparent',
                            },
                          ]}
                        >
                          {allSelected && (
                            <AppIcon name="checkCircle" size={10} color="#fff" />
                          )}
                          {!allSelected && someSelected && (
                            <View style={[styles.indeterminate, { backgroundColor: theme.colors.brand.primary }]} />
                          )}
                        </View>
                        <Text style={[typography.bodyMd, { fontWeight: '600', color: theme.colors.text.primary }]}>
                          {mod.moduleName}
                        </Text>
                      </View>
                      <View style={[styles.actionCountPill, { backgroundColor: theme.colors.surface.subtle }]}>
                        <Text style={[typography.caption, { color: theme.colors.text.secondary, fontSize: 10 }]}>
                          {mod.actions.length} Actions
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Action Items */}
                    <View style={styles.actionsGrid}>
                      {mod.actions.map((action) => {
                        const isSelected = selectedCapIds.has(action.id);
                        return (
                          <TouchableOpacity
                            key={action.id}
                            style={[
                              styles.actionItem,
                              {
                                borderColor: isSelected
                                  ? theme.colors.brand.primary
                                  : theme.colors.surface.border,
                                backgroundColor: isSelected
                                  ? `${theme.colors.brand.primary}10`
                                  : 'transparent',
                              },
                            ]}
                            onPress={() => toggleCapability(action.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: isSelected
                                    ? theme.colors.brand.primary
                                    : theme.colors.surface.border,
                                  backgroundColor: isSelected
                                    ? theme.colors.brand.primary
                                    : 'transparent',
                                },
                              ]}
                            >
                              {isSelected && (
                                <AppIcon name="checkCircle" size={10} color="#fff" />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '500' }]}>
                                {action.name}
                              </Text>
                              <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 10 }]}>
                                {action.slug}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Save Button */}
          <View
            style={[
              styles.saveBar,
              {
                backgroundColor: theme.colors.surface.card,
                borderTopColor: theme.colors.surface.border,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.colors.brand.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={saveGroup}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[typography.bodyMd, { color: '#fff', fontWeight: '600' }]}>
                  {editingGroup ? 'Save Changes' : 'Create Access Group'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  companyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  companyPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  formSection: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  moduleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indeterminate: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  actionCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  actionsGrid: {
    padding: 8,
    gap: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyCapNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
