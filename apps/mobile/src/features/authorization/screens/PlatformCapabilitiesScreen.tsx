import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { ScreenHeader, Button, Card } from '../../../shared/components';
import { typography } from '../../../shared/theme/typography';
import { api } from '../../../shared/services/api';

export interface CapabilityNode {
  id: string;
  parentId?: string | null;
  type: 'MODULE' | 'FEATURE' | 'ACTION';
  key: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: CapabilityNode[];
}

export function PlatformCapabilitiesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [capabilities, setCapabilities] = useState<CapabilityNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'MODULE' | 'FEATURE' | 'ACTION'>('MODULE');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showParentPicker, setShowParentPicker] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchCapabilities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/authorization/capabilities');
      const data = res.data?.data || res.data || [];
      setCapabilities(data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load platform capabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, []);

  // Available Modules (for Submodule parent selection)
  const availableModules = useMemo(() => {
    return capabilities.filter((c) => c.type === 'MODULE');
  }, [capabilities]);

  // Available Submodules (for Action parent selection)
  const availableSubmodules = useMemo(() => {
    const list: Array<CapabilityNode & { parentName: string }> = [];
    for (const mod of capabilities) {
      if (mod.type === 'MODULE' && mod.children) {
        for (const sub of mod.children) {
          if (sub.type === 'FEATURE') {
            list.push({ ...sub, parentName: mod.name });
          }
        }
      }
    }
    return list;
  }, [capabilities]);

  const openCreateModal = (
    type: 'MODULE' | 'FEATURE' | 'ACTION' = 'MODULE',
    preselectedParent: CapabilityNode | null = null
  ) => {
    setModalType(type);
    setSelectedParentId(preselectedParent ? preselectedParent.id : null);
    setShowParentPicker(false);
    setKeyInput('');
    setNameInput('');
    setDescInput('');
    setModalVisible(true);
  };

  // Find currently selected parent object
  const selectedParentNode = useMemo(() => {
    if (!selectedParentId) return null;
    if (modalType === 'FEATURE') {
      return availableModules.find((m) => m.id === selectedParentId) || null;
    }
    if (modalType === 'ACTION') {
      return availableSubmodules.find((s) => s.id === selectedParentId) || null;
    }
    return null;
  }, [selectedParentId, modalType, availableModules, availableSubmodules]);

  // Handle Type Change within Modal
  const handleTypeChange = (newType: 'MODULE' | 'FEATURE' | 'ACTION') => {
    setModalType(newType);
    setShowParentPicker(false);
    if (newType === 'MODULE') {
      setSelectedParentId(null);
    } else if (newType === 'FEATURE') {
      // Default to first module if available and not already set to a module
      const exists = availableModules.some((m) => m.id === selectedParentId);
      if (!exists && availableModules.length > 0) {
        setSelectedParentId(availableModules[0].id);
      } else if (!exists) {
        setSelectedParentId(null);
      }
    } else if (newType === 'ACTION') {
      // Default to first submodule if available
      const exists = availableSubmodules.some((s) => s.id === selectedParentId);
      if (!exists && availableSubmodules.length > 0) {
        setSelectedParentId(availableSubmodules[0].id);
      } else if (!exists) {
        setSelectedParentId(null);
      }
    }
  };

  const handleSave = async () => {
    const key = keyInput.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const name = nameInput.trim();

    if (!key || key.length < 2) {
      Alert.alert('Validation Error', 'Key must be at least 2 characters (e.g. attendance_punch)');
      return;
    }
    if (!name || name.length < 2) {
      Alert.alert('Validation Error', 'Display Label must be at least 2 characters');
      return;
    }

    if (modalType === 'FEATURE' && !selectedParentId) {
      Alert.alert('Validation Error', 'Please select a Main Module for this submodule.');
      return;
    }

    if (modalType === 'ACTION' && !selectedParentId) {
      Alert.alert('Validation Error', 'Please select a Submodule for this action.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/authorization/capabilities', {
        type: modalType,
        parentId: modalType === 'MODULE' ? null : selectedParentId,
        key,
        name,
        description: descInput.trim() || undefined,
        sortOrder: 10,
      });

      Alert.alert('Success', `Platform ${modalType === 'MODULE' ? 'Module' : modalType === 'FEATURE' ? 'Submodule' : 'Action'} "${name}" created successfully.`);
      setModalVisible(false);
      fetchCapabilities();
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.response?.data?.message || 'Failed to create capability');
    } finally {
      setSaving(false);
    }
  };

  const filtered = capabilities.filter((mod) => {
    if (mod.type !== 'MODULE') return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchMod = mod.name.toLowerCase().includes(q) || mod.slug.toLowerCase().includes(q);
    const matchChild = (mod.children || []).some(
      (sub) =>
        sub.name.toLowerCase().includes(q) ||
        sub.slug.toLowerCase().includes(q) ||
        (sub.children || []).some((act) => act.name.toLowerCase().includes(q) || act.slug.toLowerCase().includes(q))
    );
    return matchMod || matchChild;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader
        title="Platform Capabilities"
        subtitle="Global Modules, Submodules & Actions"
        actionLabel="+ Add Capability"
        onAction={() => openCreateModal('MODULE')}
      />

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
        <TextInput
          placeholder="Search modules or actions..."
          placeholderTextColor={theme.colors.text.tertiary}
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 12 }]}>
            Loading capability hierarchy...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}>
          {filtered.map((mod) => (
            <Card key={mod.id} style={styles.moduleCard}>
              {/* Module Header */}
              <View style={styles.moduleHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>{mod.name}</Text>
                    <View style={styles.moduleTag}>
                      <Text style={styles.moduleTagText}>MODULE</Text>
                    </View>
                  </View>
                  <Text style={[styles.slugText, { color: theme.colors.text.secondary }]}>{mod.slug}</Text>
                  {Boolean(mod.description) && (
                    <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 4, fontSize: 11 }]}>
                      {mod.description}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.addSubBtn, { borderColor: theme.colors.brand.primary }]}
                  onPress={() => openCreateModal('FEATURE', mod)}
                >
                  <Text style={[styles.addSubBtnText, { color: theme.colors.brand.primary }]}>+ Submodule</Text>
                </TouchableOpacity>
              </View>

              {/* Submodules List */}
              {mod.children && mod.children.length > 0 ? (
                <View style={styles.submodulesList}>
                  {mod.children.map((sub) => (
                    <View
                      key={sub.id}
                      style={[styles.submoduleItem, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}
                    >
                      <View style={styles.submoduleHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.label, { color: theme.colors.text.primary }]}>{sub.name}</Text>
                          <Text style={[styles.slugText, { color: theme.colors.text.tertiary }]}>{sub.slug}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addActionBtn}
                          onPress={() => openCreateModal('ACTION', sub)}
                        >
                          <Text style={[styles.addActionBtnText, { color: theme.colors.brand.secondary }]}>+ Action</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Actions chips */}
                      {sub.children && sub.children.length > 0 && (
                        <View style={styles.actionsWrap}>
                          {sub.children.map((act) => (
                            <View
                              key={act.id}
                              style={[styles.actionChip, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}
                            >
                              <Text style={[styles.actionChipName, { color: theme.colors.text.primary }]}>{act.name}</Text>
                              <Text style={[styles.actionChipSlug, { color: theme.colors.text.tertiary }]}>{act.key}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySubBox}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, fontSize: 11 }]}>
                    No submodules. Tap "+ Submodule" to add one.
                  </Text>
                </View>
              )}
            </Card>
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 8 }]}>
                No Platform Capabilities Yet
              </Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, textAlign: 'center', maxWidth: 280, marginBottom: 16 }]}>
                Build your authorization tree from scratch by creating your first Main Module.
              </Text>
              <Button
                label="+ Create First Module"
                variant="primary"
                onPress={() => openCreateModal('MODULE')}
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface.card, maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
                  Add Platform Capability
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ fontSize: 20, color: theme.colors.text.secondary, fontWeight: '600' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Capability Type Selector (Segmented) */}
              <View style={styles.fieldGroup}>
                <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                  Capability Type <Text style={{ color: theme.colors.semantic.error }}>*</Text>
                </Text>
                <View style={[styles.typeSegmentContainer, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.typeSegmentBtn,
                      modalType === 'MODULE' && [styles.typeSegmentActive, { backgroundColor: theme.colors.brand.primary }],
                    ]}
                    onPress={() => handleTypeChange('MODULE')}
                  >
                    <Text
                      style={[
                        styles.typeSegmentText,
                        { color: modalType === 'MODULE' ? '#ffffff' : theme.colors.text.secondary },
                      ]}
                    >
                      Main Module
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSegmentBtn,
                      modalType === 'FEATURE' && [styles.typeSegmentActive, { backgroundColor: theme.colors.brand.primary }],
                    ]}
                    onPress={() => handleTypeChange('FEATURE')}
                  >
                    <Text
                      style={[
                        styles.typeSegmentText,
                        { color: modalType === 'FEATURE' ? '#ffffff' : theme.colors.text.secondary },
                      ]}
                    >
                      Submodule
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSegmentBtn,
                      modalType === 'ACTION' && [styles.typeSegmentActive, { backgroundColor: theme.colors.brand.primary }],
                    ]}
                    onPress={() => handleTypeChange('ACTION')}
                  >
                    <Text
                      style={[
                        styles.typeSegmentText,
                        { color: modalType === 'ACTION' ? '#ffffff' : theme.colors.text.secondary },
                      ]}
                    >
                      Action
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submodule Parent Dropdown */}
              {modalType === 'FEATURE' && (
                <View style={styles.fieldGroup}>
                  <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                    Select Main Module <Text style={{ color: theme.colors.semantic.error }}>*</Text>
                  </Text>
                  {availableModules.length === 0 ? (
                    <View style={[styles.warningBox, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                      <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>
                        ⚠️ No Main Modules exist yet. Switch to "Main Module" above to create one first.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dropdownTrigger, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}
                        onPress={() => setShowParentPicker(!showParentPicker)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
                            {selectedParentNode ? selectedParentNode.name : '-- Select Main Module --'}
                          </Text>
                          {selectedParentNode && (
                            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.colors.text.tertiary, marginTop: 2 }}>
                              slug: {selectedParentNode.slug}
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, color: theme.colors.text.secondary }}>
                          {showParentPicker ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>

                      {showParentPicker && (
                        <View style={[styles.dropdownList, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}>
                          {availableModules.map((mod) => (
                            <TouchableOpacity
                              key={mod.id}
                              style={[
                                styles.dropdownItem,
                                selectedParentId === mod.id && { backgroundColor: theme.colors.brand.primaryMuted || '#e0e7ff' },
                              ]}
                              onPress={() => {
                                setSelectedParentId(mod.id);
                                setShowParentPicker(false);
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: selectedParentId === mod.id ? '700' : '500', color: theme.colors.text.primary }}>
                                {mod.name}
                              </Text>
                              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.colors.text.tertiary }}>
                                {mod.slug}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Action Parent Dropdown */}
              {modalType === 'ACTION' && (
                <View style={styles.fieldGroup}>
                  <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                    Select Submodule <Text style={{ color: theme.colors.semantic.error }}>*</Text>
                  </Text>
                  {availableSubmodules.length === 0 ? (
                    <View style={[styles.warningBox, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                      <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>
                        ⚠️ No Submodules exist yet. Create a Main Module and Submodule first.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dropdownTrigger, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}
                        onPress={() => setShowParentPicker(!showParentPicker)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
                            {selectedParentNode ? selectedParentNode.name : '-- Select Submodule --'}
                          </Text>
                          {selectedParentNode && (
                            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.colors.text.tertiary, marginTop: 2 }}>
                              slug: {selectedParentNode.slug}
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, color: theme.colors.text.secondary }}>
                          {showParentPicker ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>

                      {showParentPicker && (
                        <View style={[styles.dropdownList, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.surface.border }]}>
                          {availableSubmodules.map((sub) => (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.dropdownItem,
                                selectedParentId === sub.id && { backgroundColor: theme.colors.brand.primaryMuted || '#e0e7ff' },
                              ]}
                              onPress={() => {
                                setSelectedParentId(sub.id);
                                setShowParentPicker(false);
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: selectedParentId === sub.id ? '700' : '500', color: theme.colors.text.primary }}>
                                [{sub.parentName}] → {sub.name}
                              </Text>
                              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.colors.text.tertiary }}>
                                {sub.slug}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Machine Key Field */}
              <View style={styles.fieldGroup}>
                <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
                  Machine-Readable Key <Text style={{ color: theme.colors.semantic.error }}>*</Text>
                </Text>
                <TextInput
                  placeholder={
                    modalType === 'MODULE'
                      ? 'e.g. attendance'
                      : modalType === 'FEATURE'
                      ? 'e.g. punch'
                      : 'e.g. view'
                  }
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={[styles.modalInput, { borderColor: theme.colors.surface.border, color: theme.colors.text.primary }]}
                  value={keyInput}
                  onChangeText={setKeyInput}
                  autoCapitalize="none"
                />
                <Text style={[typography.bodySm, { color: theme.colors.text.tertiary, marginTop: 2, fontSize: 11 }]}>
                  Lowercase alphanumeric with underscores.
                  {Boolean(selectedParentNode && keyInput) && (
                    <Text style={{ fontWeight: '700', color: theme.colors.brand.primary }}>
                      {'\n'}Resulting Slug: {selectedParentNode?.slug}.{keyInput.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')}
                    </Text>
                  )}
                  {Boolean(!selectedParentNode && modalType === 'MODULE' && keyInput) && (
                    <Text style={{ fontWeight: '700', color: theme.colors.brand.primary }}>
                      {'\n'}Resulting Slug: {keyInput.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')}
                    </Text>
                  )}
                </Text>
              </View>

              {/* Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
                  Display Label <Text style={{ color: theme.colors.semantic.error }}>*</Text>
                </Text>
                <TextInput
                  placeholder={
                    modalType === 'MODULE'
                      ? 'e.g. Attendance Management'
                      : modalType === 'FEATURE'
                      ? 'e.g. Punch In / Out'
                      : 'e.g. Punch In / Out'
                  }
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={[styles.modalInput, { borderColor: theme.colors.surface.border, color: theme.colors.text.primary }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                />
              </View>

              {/* Description Field */}
              <View style={styles.fieldGroup}>
                <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
                  Description (Optional)
                </Text>
                <TextInput
                  placeholder="Brief summary of what this capability controls"
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={[styles.modalInput, { borderColor: theme.colors.surface.border, color: theme.colors.text.primary, height: 60 }]}
                  value={descInput}
                  onChangeText={setDescInput}
                  multiline
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  label={saving ? 'Saving...' : 'Create'}
                  variant="primary"
                  onPress={handleSave}
                  loading={saving}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 40,
    fontSize: 14,
  },
  loadingBox: {
    paddingTop: 60,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  moduleCard: {
    padding: 14,
    borderRadius: 10,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3730a3',
  },
  slugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  addSubBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addSubBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  submodulesList: {
    gap: 8,
    marginTop: 6,
  },
  submoduleItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  submoduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionChipName: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionChipSlug: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  emptySubBox: {
    paddingVertical: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  typeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  typeSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeSegmentActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
