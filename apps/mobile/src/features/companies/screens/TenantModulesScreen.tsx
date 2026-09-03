import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Platform, Text } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button, Card, ScreenHeader, LoadingState, AppIcon } from '../../../shared/components';
import { useCompanyDetail, useUpdateCompany } from '../hooks/useCompanies';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  children?: CapabilityNode[];
}

export function TenantModulesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const companyId = route.params?.companyId;

  const { data: company, isLoading: isLoadingCompany } = useCompanyDetail(companyId);
  const updateCompanyMutation = useUpdateCompany();

  const [platformCapabilities, setPlatformCapabilities] = useState<CapabilityNode[]>([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<Set<string>>(new Set());
  const [loadingCaps, setLoadingCaps] = useState<boolean>(true);

  useEffect(() => {
    // 1. Fetch all platform capabilities
    const fetchCaps = async () => {
      setLoadingCaps(true);
      try {
        const [capsRes, entRes] = await Promise.all([
          api.get('/authorization/capabilities'),
          companyId ? api.get(`/authorization/companies/${companyId}/entitlements`) : Promise.resolve({ data: { data: [] } }),
        ]);

        const allCaps = capsRes.data?.data || capsRes.data || [];
        setPlatformCapabilities(allCaps);

        const entitled = entRes.data?.data || entRes.data || [];
        const entitledSet = new Set<string>(
          entitled
            .filter((e: any) => e.isEnabled !== false)
            .map((e: any) => e.capabilityId || e.capability?.id || e.id)
        );
        setSelectedCapabilityIds(entitledSet);
      } catch (err: any) {
        console.error('Failed to load capabilities or entitlements', err);
      } finally {
        setLoadingCaps(false);
      }
    };

    fetchCaps();
  }, [companyId]);

  const toggleModule = (mod: CapabilityNode) => {
    setSelectedCapabilityIds((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(mod.id);
      if (isSelected) {
        next.delete(mod.id);
        if (mod.children) {
          for (const sub of mod.children) {
            next.delete(sub.id);
            if (sub.children) {
              for (const act of sub.children) {
                next.delete(act.id);
              }
            }
          }
        }
      } else {
        next.add(mod.id);
        if (mod.children) {
          for (const sub of mod.children) {
            next.add(sub.id);
            if (sub.children) {
              for (const act of sub.children) {
                next.add(act.id);
              }
            }
          }
        }
      }
      return next;
    });
  };

  const toggleSubmodule = (mod: CapabilityNode, sub: CapabilityNode) => {
    setSelectedCapabilityIds((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(sub.id);
      if (isSelected) {
        next.delete(sub.id);
        if (sub.children) {
          for (const act of sub.children) {
            next.delete(act.id);
          }
        }
        const hasOtherSelectedSub = mod.children?.some(
          (s) => s.id !== sub.id && (next.has(s.id) || s.children?.some((a) => next.has(a.id)))
        );
        if (!hasOtherSelectedSub) {
          next.delete(mod.id);
        }
      } else {
        next.add(sub.id);
        next.add(mod.id);
        if (sub.children) {
          for (const act of sub.children) {
            next.add(act.id);
          }
        }
      }
      return next;
    });
  };

  const toggleAction = (mod: CapabilityNode, sub: CapabilityNode, act: CapabilityNode) => {
    setSelectedCapabilityIds((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(act.id);
      if (isSelected) {
        next.delete(act.id);
        const hasOtherSelectedAction = sub.children?.some((a) => a.id !== act.id && next.has(a.id));
        if (!hasOtherSelectedAction) {
          next.delete(sub.id);
          const hasOtherSelectedSub = mod.children?.some(
            (s) => s.id !== sub.id && (next.has(s.id) || s.children?.some((a) => next.has(a.id)))
          );
          if (!hasOtherSelectedSub) {
            next.delete(mod.id);
          }
        }
      } else {
        next.add(act.id);
        next.add(sub.id);
        next.add(mod.id);
      }
      return next;
    });
  };

  const handleSave = () => {
    updateCompanyMutation.mutate(
      {
        id: companyId,
        payload: {
          capabilityIds: Array.from(selectedCapabilityIds),
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Tenant capabilities & modules updated successfully');
          navigation.goBack();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.response?.data?.message || 'Failed to update modules');
        },
      }
    );
  };

  if (isLoadingCompany || loadingCaps) {
    return <LoadingState message="Loading tenant capabilities..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader title="Tenant Modules & Access" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AppIcon name="lock" size={32} color={theme.colors.brand.primary} />
          <View style={styles.headerText}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="building" size={14} color={theme.colors.text.secondary} />
              <Text style={{ marginLeft: 6, color: theme.colors.text.primary, marginBottom: 0, ...typography.headingMd }}>
                {company?.name || 'Company'}
              </Text>
            </View>
            <Text style={{ color: theme.colors.text.secondary, ...typography.bodyMd }}>
              Configure entitled Platform Capabilities for this tenant
            </Text>
          </View>
        </View>

        {platformCapabilities.length === 0 ? (
          <Card style={styles.card}>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary, textAlign: 'center', paddingVertical: 16 }]}>
              No platform capabilities registered in Platform Capabilities registry.
            </Text>
          </Card>
        ) : (
          platformCapabilities.map((mod) => {
            const isModSelected = selectedCapabilityIds.has(mod.id);

            return (
              <Card key={mod.id} style={styles.card}>
                {/* Module Master Toggle */}
                <View style={[styles.moduleRow, { borderBottomColor: theme.colors.surface.border, borderBottomWidth: (mod.children && mod.children.length > 0) ? 1 : 0 }]}>
                  <View style={styles.moduleInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.subtle }]}>
                      <AppIcon name="grid" color={theme.colors.text.primary} size={20} />
                    </View>
                    <View style={styles.moduleTexts}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ ...typography.headingMd, fontSize: 16, color: theme.colors.text.primary }}>
                          {mod.name}
                        </Text>
                      </View>
                      <Text style={{ ...typography.bodySm, fontSize: 11, fontFamily: 'monospace', color: theme.colors.text.tertiary, marginTop: 1 }}>
                        {mod.slug}
                      </Text>
                      {Boolean(mod.description) && (
                        <Text style={{ ...typography.bodySm, fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 }}>
                          {mod.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Switch
                    value={isModSelected}
                    onValueChange={() => toggleModule(mod)}
                    trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isModSelected ? '#FFFFFF' : '#f4f3f4')}
                  />
                </View>

                {/* Submodules List */}
                {mod.children && mod.children.length > 0 && (
                  <View style={{ backgroundColor: theme.colors.surface.subtle, paddingLeft: 16, paddingRight: 0 }}>
                    {mod.children.map((sub, idx) => {
                      const isSubSelected = selectedCapabilityIds.has(sub.id);
                      const isLast = idx === mod.children!.length - 1;

                      return (
                        <View
                          key={sub.id}
                          style={{ borderBottomColor: theme.colors.surface.border, borderBottomWidth: isLast ? 0 : 1, paddingVertical: 10, paddingRight: 16 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={styles.moduleInfo}>
                              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.background }]}>
                                <AppIcon name="settings" color={theme.colors.text.primary} size={18} />
                              </View>
                              <View style={styles.moduleTexts}>
                                <Text style={{ ...typography.headingMd, fontSize: 14, color: theme.colors.text.primary }}>
                                  {sub.name}
                                </Text>
                                <Text style={{ ...typography.bodySm, fontSize: 10, fontFamily: 'monospace', color: theme.colors.text.tertiary }}>
                                  {sub.slug}
                                </Text>
                                {Boolean(sub.description) && (
                                  <Text style={{ ...typography.bodySm, fontSize: 11, color: theme.colors.text.secondary, marginTop: 2 }}>
                                    {sub.description}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Switch
                              value={isSubSelected}
                              onValueChange={() => toggleSubmodule(mod, sub)}
                              trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isSubSelected ? '#FFFFFF' : '#f4f3f4')}
                            />
                          </View>

                          {/* Actions under Submodule */}
                          {sub.children && sub.children.length > 0 && (
                            <View style={{ marginTop: 8, marginLeft: 36, borderLeftWidth: 2, borderLeftColor: theme.colors.brand.primaryLight, paddingLeft: 10, gap: 6 }}>
                              {sub.children.map((act) => {
                                const isActSelected = selectedCapabilityIds.has(act.id);
                                return (
                                  <View key={act.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                      <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: '500' }]}>{act.name}</Text>
                                      <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary, fontSize: 10 }]}>{act.slug}</Text>
                                    </View>
                                    <Switch
                                      value={isActSelected}
                                      onValueChange={() => toggleAction(mod, sub, act)}
                                      trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                                      thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isActSelected ? '#FFFFFF' : '#f4f3f4')}
                                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })
        )}

        <View style={styles.actions}>
          <Button
            label="Save Changes"
            variant="primary"
            loading={updateCompanyMutation.isPending}
            disabled={updateCompanyMutation.isPending}
            onPress={handleSave}
            style={{ width: '100%' }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 12,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  moduleTexts: {
    flex: 1,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
});
