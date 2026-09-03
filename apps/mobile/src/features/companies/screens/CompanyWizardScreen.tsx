import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button, Card, Input, AppIcon, ScreenHeader, PhoneInput, LoadingState } from '../../../shared/components';
import { useCreateCompany, useCompanyDetail, useUpdateCompany } from '../hooks/useCompanies';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyWizardSchema } from '@netrotrack/shared';
import { CompanyFormFields } from '../components/CompanyFormFields';
import { usePermissions } from '../../../shared/hooks/usePermissions';
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

export function CompanyWizardScreen() {
  const theme = useTheme();
  const permissions = usePermissions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const companyId = route.params?.companyId;
  const isEditMode = !!companyId;

  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const { data: company, isLoading: isLoadingCompany } = useCompanyDetail(companyId);

  const scrollViewRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);

  const [platformCapabilities, setPlatformCapabilities] = useState<CapabilityNode[]>([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<Set<string>>(new Set());
  const [loadingCaps, setLoadingCaps] = useState<boolean>(true);

  const { control, handleSubmit, trigger, formState: { errors }, watch, setValue, reset } = useForm<any>({
    resolver: zodResolver(CompanyWizardSchema),
    defaultValues: {
      company: {
        name: '', code: '', legalName: '', industry: '', companyType: '', employeeCount: '',
        officialEmail: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '',
        zipCode: '', country: 'India', timezone: 'Asia/Kolkata', currency: 'INR', taxId: '', registrationNumber: '',
      },
      admin: { name: '', email: '', mobile: '', password: '', confirmPassword: '' },
      modules: {},
      capabilityIds: [],
    }
  });

  // Fetch capabilities & entitlements
  useEffect(() => {
    const fetchCapabilities = async () => {
      setLoadingCaps(true);
      try {
        const [capsRes, entRes] = await Promise.all([
          api.get('/authorization/capabilities'),
          isEditMode && companyId ? api.get(`/authorization/companies/${companyId}/entitlements`) : Promise.resolve({ data: { data: [] } }),
        ]);

        const allCaps: CapabilityNode[] = capsRes.data?.data || capsRes.data || [];
        setPlatformCapabilities(allCaps);

        if (isEditMode) {
          const entitled = entRes.data?.data || entRes.data || [];
          const entitledSet = new Set<string>(
            entitled
              .filter((e: any) => e.isEnabled !== false)
              .map((e: any) => e.capabilityId || e.capability?.id || e.id)
          );
          setSelectedCapabilityIds(entitledSet);
        } else {
          // In create mode: select all by default
          const allIds = new Set<string>();
          const collect = (nodes: CapabilityNode[]) => {
            for (const n of nodes) {
              allIds.add(n.id);
              if (n.children) collect(n.children);
            }
          };
          collect(allCaps);
          setSelectedCapabilityIds(allIds);
        }
      } catch (err) {
        console.error('Failed to load capabilities', err);
      } finally {
        setLoadingCaps(false);
      }
    };

    fetchCapabilities();
  }, [companyId, isEditMode]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && company) {
      reset({
        company: {
          name: company.name || '',
          code: company.code || '',
          legalName: company.legalName || '',
          industry: company.industry || '',
          companyType: company.companyType || '',
          employeeCount: company.employeeCount || '',
          officialEmail: company.officialEmail || '',
          phone: company.phone || '',
          addressLine1: company.addressLine1 || '',
          addressLine2: company.addressLine2 || '',
          city: company.city || '',
          state: company.state || '',
          zipCode: company.zipCode || '',
          country: company.country || 'India',
          timezone: company.timezone || 'Asia/Kolkata',
          currency: company.currency || 'INR',
          taxId: company.taxId || '',
          registrationNumber: company.registrationNumber || '',
        },
        admin: { name: 'admin', email: 'admin@edit.com', mobile: '9999999999', password: 'Password@123', confirmPassword: 'Password@123' },
        modules: {},
        capabilityIds: [],
      });
    }
  }, [company, isEditMode, reset]);

  const companyData = watch('company') || {};
  const adminData = watch('admin') || {};

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

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(['company.name', 'company.code', 'company.legalName', 'company.industry', 'company.companyType', 'company.employeeCount']);
    } else if (step === 2) {
      isValid = await trigger(['company.officialEmail', 'company.phone', 'company.addressLine1', 'company.addressLine2', 'company.city', 'company.state', 'company.zipCode', 'company.country', 'company.timezone', 'company.currency', 'company.taxId', 'company.registrationNumber']);
    } else if (step === 3) {
      isValid = await trigger(['admin.name', 'admin.email', 'admin.mobile', 'admin.password', 'admin.confirmPassword']);
    } else if (step === 4) {
      isValid = true;
    }

    if (isValid) {
      if (isEditMode && step === 2) {
        setStep(4);
      } else {
        setStep(step + 1);
      }
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } else {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (isEditMode && step === 4) {
        setStep(2);
      } else {
        setStep(step - 1);
      }
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } else {
      navigation.goBack();
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const capIds = Array.from(selectedCapabilityIds);

      if (isEditMode) {
        await updateCompanyMutation.mutateAsync({
          id: companyId,
          payload: {
            ...data.company,
            capabilityIds: capIds,
          }
        });
      } else {
        await createCompanyMutation.mutateAsync({
          ...data,
          capabilityIds: capIds,
        });
      }
      setStep(6);
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} company.`;
      Alert.alert('Error', msg);
    }
  };

  const getVisualIndex = (actualStep: number) => {
    if (!isEditMode) return actualStep;
    if (actualStep < 3) return actualStep;
    if (actualStep > 3) return actualStep - 1;
    return actualStep;
  };

  const renderStepper = () => {
    if (step === 6) return null;
    
    const stepLabels = isEditMode 
      ? ['Profile', 'Contact', 'Modules', 'Review']
      : ['Profile', 'Contact', 'Admin', 'Modules', 'Review'];

    return (
      <View style={styles.stepperContainer}>
        {stepLabels.map((label, index) => {
          const visualStep = index + 1;
          const currentVisualStep = getVisualIndex(step);
          
          const isCurrent = currentVisualStep === visualStep;
          const isCompleted = currentVisualStep > visualStep;
          const isActive = isCurrent || isCompleted;
          
          return (
            <View key={index} style={styles.stepItem}>
              <View style={[
                styles.stepCircle, 
                { 
                  backgroundColor: isActive ? theme.colors.brand.primary : theme.colors.surface.disabled,
                  borderColor: isActive ? theme.colors.brand.primary : theme.colors.surface.border
                }
              ]}>
                {isCompleted ? (
                  <AppIcon name="check" color="#FFF" size={12} />
                ) : (
                  <Text style={[styles.stepNumber, { color: isActive ? '#FFF' : theme.colors.text.secondary }]}>
                    {visualStep}
                  </Text>
                )}
              </View>
              <Text 
                numberOfLines={1} 
                style={[
                  styles.stepLabel, 
                  { 
                    color: isActive ? theme.colors.text.primary : theme.colors.text.tertiary,
                    fontWeight: isActive ? '600' : '400' 
                  }
                ]}
              >
                {label}
              </Text>
              {index < stepLabels.length - 1 && (
                <View style={[
                  styles.stepLine, 
                  { backgroundColor: isCompleted ? theme.colors.brand.primary : theme.colors.surface.border }
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (isEditMode && (isLoadingCompany || loadingCaps)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
        <ScreenHeader title="Edit Company" onBackPress={() => navigation.goBack()} />
        <LoadingState message="Loading company details..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {step < 6 && (
        <ScreenHeader 
          title={isEditMode ? "Edit Company" : "Register New Company"} 
          onBackPress={handleBack} 
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        {renderStepper()}

        <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 1 && <CompanyFormFields control={control} errors={errors} setValue={setValue} step={1} prefix="company." />}
          {step === 2 && <CompanyFormFields control={control} errors={errors} setValue={setValue} step={2} prefix="company." />}

          {step === 3 && !isEditMode && (() => {
            const getAdminError = (field: string) => (errors.admin as any)?.[field]?.message;
            return (
            <Card variant="outlined" style={styles.cardContent}>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>Primary Administrator</Text>
              
              <Controller control={control} name="admin.name" render={({ field: { onChange, value } }) => (
                <Input label="Admin Name *" value={value} onChangeText={onChange} error={getAdminError('name')} />
              )}/>
              <Controller control={control} name="admin.email" render={({ field: { onChange, value } }) => (
                <Input label="Admin Email *" value={value} onChangeText={onChange} keyboardType="email-address" error={getAdminError('email')} />
              )}/>
              
              <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>Admin Mobile *</Text>
              <Controller control={control} name="admin.mobile" render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 12 }}>
                  <PhoneInput value={value} onChangeText={onChange} defaultCountryCode="+91" />
                  {getAdminError('mobile') && <Text style={styles.errorText}>{getAdminError('mobile')}</Text>}
                </View>
              )}/>
              
              <Controller control={control} name="admin.password" render={({ field: { onChange, value } }) => (
                <Input label="Initial Password *" value={value} onChangeText={onChange} isPassword error={getAdminError('password')} />
              )}/>
              <Controller control={control} name="admin.confirmPassword" render={({ field: { onChange, value } }) => (
                <Input label="Confirm Password *" value={value} onChangeText={onChange} isPassword error={getAdminError('confirmPassword')} />
              )}/>
            </Card>
            );
          })()}

          {step === 4 && (
            <Card variant="outlined" style={styles.cardContent}>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 4 }]}>
                Platform Modules & Capabilities
              </Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginBottom: 16 }]}>
                Select the modules, submodules, and actions to entitle for this tenant company.
              </Text>

              {platformCapabilities.length === 0 ? (
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary, textAlign: 'center', paddingVertical: 16 }]}>
                  No platform capabilities registered yet in Platform Capabilities.
                </Text>
              ) : (
                platformCapabilities.map((mod) => {
                  const isModSelected = selectedCapabilityIds.has(mod.id);

                  return (
                    <View key={mod.id} style={{ marginBottom: 14, borderWidth: 1, borderColor: theme.colors.surface.border, borderRadius: 10, overflow: 'hidden' }}>
                      {/* Module Header */}
                      <View style={styles.moduleRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '700' }]}>{mod.name}</Text>
                          <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary }]}>{mod.slug}</Text>
                          {Boolean(mod.description) && (
                            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>{mod.description}</Text>
                          )}
                        </View>
                        <Switch
                          value={isModSelected}
                          onValueChange={() => toggleModule(mod)}
                          trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
                        />
                      </View>

                      {/* Submodules */}
                      {mod.children && mod.children.length > 0 && (
                        <View style={{ backgroundColor: theme.colors.surface.subtle, paddingLeft: 16, borderTopWidth: 1, borderTopColor: theme.colors.surface.border }}>
                          {mod.children.map((sub, sIdx) => {
                            const isSubSelected = selectedCapabilityIds.has(sub.id);
                            const isLast = sIdx === mod.children!.length - 1;

                            return (
                              <View
                                key={sub.id}
                                style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: theme.colors.surface.border, paddingVertical: 8, paddingRight: 12 }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>{sub.name}</Text>
                                    <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary }]}>{sub.slug}</Text>
                                    {Boolean(sub.description) && (
                                      <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>{sub.description}</Text>
                                    )}
                                  </View>
                                  <Switch
                                    value={isSubSelected}
                                    onValueChange={() => toggleSubmodule(mod, sub)}
                                    trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
                                  />
                                </View>

                                {/* Actions under Submodule */}
                                {sub.children && sub.children.length > 0 && (
                                  <View style={{ marginTop: 8, marginLeft: 12, borderLeftWidth: 2, borderLeftColor: theme.colors.brand.primaryLight, paddingLeft: 10, gap: 6 }}>
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
                                            trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
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
                    </View>
                  );
                })
              )}
            </Card>
          )}

          {step === 5 && (
            <Card variant="outlined" style={styles.cardContent}>
              <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>Review Summary</Text>
              
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Company Profile</Text>
                <Text style={styles.summaryLabel}>Name: <Text style={styles.summaryValue}>{companyData.name} ({companyData.code})</Text></Text>
                <Text style={styles.summaryLabel}>Type: <Text style={styles.summaryValue}>{companyData.companyType || 'N/A'}</Text></Text>
                <Text style={styles.summaryLabel}>Industry: <Text style={styles.summaryValue}>{companyData.industry || 'N/A'}</Text></Text>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Location & Tax</Text>
                <Text style={styles.summaryLabel}>Location: <Text style={styles.summaryValue}>{[companyData.city, companyData.state, companyData.country].filter(Boolean).join(', ') || 'N/A'}</Text></Text>
                <Text style={styles.summaryLabel}>GSTIN/Tax ID: <Text style={styles.summaryValue}>{companyData.taxId || 'N/A'}</Text></Text>
                <Text style={styles.summaryLabel}>Currency/TZ: <Text style={styles.summaryValue}>{companyData.currency} | {companyData.timezone}</Text></Text>
              </View>

              {!isEditMode && (
                <View style={styles.summarySection}>
                  <Text style={styles.summaryTitle}>Admin Setup</Text>
                  <Text style={styles.summaryLabel}>Admin Name: <Text style={styles.summaryValue}>{adminData.name}</Text></Text>
                  <Text style={styles.summaryLabel}>Admin Contact: <Text style={styles.summaryValue}>{adminData.email} | {adminData.mobile}</Text></Text>
                </View>
              )}

              <View style={[styles.summarySection, { borderBottomWidth: 0 }]}>
                <Text style={[styles.summaryTitle, { marginBottom: 10 }]}>Enabled Modules & Capabilities</Text>
                {(() => {
                  const selectedMods = platformCapabilities.filter((mod) => selectedCapabilityIds.has(mod.id));
                  if (selectedMods.length === 0) {
                    return <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]}>No modules or capabilities selected.</Text>;
                  }

                  return (
                    <View style={{ gap: 10 }}>
                      {selectedMods.map((mod) => {
                        const selectedSubs = (mod.children || []).filter((sub) => selectedCapabilityIds.has(sub.id));

                        return (
                          <View
                            key={mod.id}
                            style={{
                              backgroundColor: theme.colors.surface.subtle,
                              borderRadius: 8,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: theme.colors.surface.border,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '700' }]}>{mod.name}</Text>
                              <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary, fontSize: 10 }]}>{mod.slug}</Text>
                            </View>

                            {selectedSubs.length > 0 && (
                              <View style={{ marginTop: 8, marginLeft: 8, borderLeftWidth: 2, borderLeftColor: theme.colors.brand.primary, paddingLeft: 8, gap: 8 }}>
                                {selectedSubs.map((sub) => {
                                  const selectedActs = (sub.children || []).filter((act) => selectedCapabilityIds.has(act.id));

                                  return (
                                    <View key={sub.id}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>{sub.name}</Text>
                                        <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary, fontSize: 9 }]}>{sub.slug}</Text>
                                      </View>

                                      {selectedActs.length > 0 && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginLeft: 4 }}>
                                          {selectedActs.map((act) => (
                                            <View
                                              key={act.id}
                                              style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: theme.colors.surface.card,
                                                borderWidth: 1,
                                                borderColor: theme.colors.surface.border,
                                                borderRadius: 4,
                                                paddingHorizontal: 6,
                                                paddingVertical: 2,
                                                gap: 4,
                                              }}
                                            >
                                              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.brand.primary }} />
                                              <Text style={[typography.caption, { color: theme.colors.text.secondary, fontSize: 10, fontWeight: '500' }]}>{act.name}</Text>
                                            </View>
                                          ))}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </Card>
          )}

          {step === 6 && (
            <View style={styles.successContainer}>
              <View style={[styles.successIconWrapper, { backgroundColor: theme.colors.brand.primaryLight }]}>
                <AppIcon name="check" color={theme.colors.brand.primary} size={48} />
              </View>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary, marginBottom: 12, textAlign: 'center' }]}>
                {isEditMode ? 'Company Updated' : 'Company Created'}
              </Text>
              <Text style={[typography.bodyMd, { color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 32 }]}>
                {isEditMode 
                  ? 'The company details have been successfully updated.'
                  : 'The multi-tenant workspace has been successfully provisioned. You can now configure organizational structures.'}
              </Text>
              <Button 
                label="Done" 
                variant="primary" 
                size="lg"
                fullWidth
                onPress={() => {
                  if (permissions.isSuperAdmin && !isEditMode) {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'SuperAdminDashboard' }],
                    });
                  } else {
                    navigation.goBack();
                  }
                }}
              />
            </View>
          )}
        </ScrollView>

        {step < 6 && (
          <View style={[styles.footer, { backgroundColor: theme.colors.surface.card, borderTopColor: theme.colors.surface.border }]}>
            {step > 1 && (
              <Button 
                label="Previous" 
                variant="outline" 
                onPress={handleBack} 
                style={{ flex: 1, marginRight: 8 }} 
              />
            )}
            
            {step < 5 ? (
              <Button 
                label="Next" 
                variant="primary" 
                onPress={handleNext} 
                style={{ flex: 1, marginLeft: step > 1 ? 8 : 0 }} 
              />
            ) : (
              <Button 
                label={isEditMode ? "Save Changes" : "Create Company"} 
                variant="primary" 
                loading={createCompanyMutation.isPending || updateCompanyMutation.isPending}
                onPress={handleSubmit(onSubmit)} 
                style={{ flex: 1, marginLeft: step > 1 ? 8 : 0 }} 
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    zIndex: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '50%',
    width: '100%',
    height: 2,
    zIndex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContent: {
    padding: 16,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  summarySection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
