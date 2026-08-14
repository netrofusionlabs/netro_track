import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button, Card, Input, AppIcon, ScreenHeader, PhoneInput, LoadingState } from '../../../shared/components';
import { useCreateCompany, useCompanyDetail, useUpdateCompany } from '../hooks/useCompanies';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyWizardSchema, CreateCompanyWizardInput } from '@netrotrack/shared';
import { CompanyFormFields } from '../components/CompanyFormFields';

export function CompanyWizardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const companyId = route.params?.companyId;
  const isEditMode = !!companyId;

  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const { data: company, isLoading: isLoadingCompany } = useCompanyDetail(companyId);

  const scrollViewRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);

  const { control, handleSubmit, trigger, formState: { errors }, watch, setValue, reset } = useForm<any>({
    resolver: zodResolver(CompanyWizardSchema), // The backend update schema is a subset of this, but we'll use this since the form handles both
    defaultValues: {
      company: {
        name: '', code: '', legalName: '', industry: '', companyType: '', employeeCount: '',
        officialEmail: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '',
        zipCode: '', country: 'India', timezone: 'Asia/Kolkata', currency: 'INR', taxId: '', registrationNumber: '',
      },
      admin: { name: '', email: '', mobile: '', password: '', confirmPassword: '' },
      modules: { attendance: false, leave: false, shift: false, gps: true, payroll: false, expense: false, asset: false, performance: false, recruitment: false }
    }
  });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && company) {
      reset({
        company: {
          name: company.name || '', code: company.code || '', legalName: company.legalName || '', industry: company.industry || '', 
          companyType: company.companyType || '', employeeCount: company.employeeCount || '', officialEmail: company.officialEmail || '', 
          phone: company.phone || '', addressLine1: company.addressLine1 || '', addressLine2: company.addressLine2 || '', 
          city: company.city || '', state: company.state || '', zipCode: company.zipCode || '', country: company.country || 'India', 
          timezone: company.timezone || 'Asia/Kolkata', currency: company.currency || 'INR', taxId: company.taxId || '', 
          registrationNumber: company.registrationNumber || '',
        },
        // Admin fields are not required/edited in edit mode
        admin: { name: 'admin', email: 'admin@edit.com', mobile: '9999999999', password: 'Password@123', confirmPassword: 'Password@123' },
        modules: { gps: company.isGpsEnabled || false, attendance: false, leave: false, shift: false, payroll: false, expense: false, asset: false, performance: false, recruitment: false }
      });
    }
  }, [company, isEditMode, reset]);

  const modulesData = watch('modules') || {};
  const companyData = watch('company') || {};
  const adminData = watch('admin') || {};

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
      // Skip step 3 (Admin) in edit mode
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
      // Skip step 3 (Admin) backward in edit mode
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
      if (isEditMode) {
        await updateCompanyMutation.mutateAsync({
          id: companyId,
          payload: { ...data.company, isGpsEnabled: data.modules?.gps }
        });
      } else {
        await createCompanyMutation.mutateAsync(data);
      }
      setStep(6); // Success step
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} company.`;
      Alert.alert('Error', msg);
    }
  };

  const toggleModule = (key: string) => {
    setValue(`modules.${key}`, !modulesData[key as keyof typeof modulesData]);
  };

  const renderModuleToggle = (key: string, title: string, desc: string) => (
    <View style={styles.moduleRow} key={key}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '500' }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>{desc}</Text>
      </View>
      <Switch 
        value={!!modulesData[key as keyof typeof modulesData]} 
        onValueChange={() => toggleModule(key)}
        trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
      />
    </View>
  );

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

  if (isEditMode && isLoadingCompany) {
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
          {step === 1 && <CompanyFormFields control={control} errors={errors} step={1} prefix="company." />}
          {step === 2 && <CompanyFormFields control={control} errors={errors} step={2} prefix="company." />}

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
              <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>HRMS Modules</Text>
              {renderModuleToggle('gps', 'GPS Tracking', 'Track live locations & routes')}
              {renderModuleToggle('attendance', 'Attendance', 'Punch-in/out and timesheets')}
              {renderModuleToggle('leave', 'Leave Management', 'Manage time-off requests')}
              {renderModuleToggle('shift', 'Shift Planning', 'Rosters and shift rotations')}
              {renderModuleToggle('payroll', 'Payroll', 'Salary and compensation')}
              {renderModuleToggle('expense', 'Expenses', 'Reimbursements and claims')}
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
                <Text style={styles.summaryTitle}>Active Modules</Text>
                <Text style={styles.summaryValue}>
                  {Object.entries(modulesData).filter(([_, v]) => v).map(([k]) => k.toUpperCase()).join(', ') || 'None'}
                </Text>
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
                label={isEditMode ? "Back to Dashboard" : "Go to Company Setup"} 
                variant="primary" 
                size="lg"
                fullWidth
                onPress={() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'CompanyManagement' }],
                  });
                  if (!isEditMode) {
                    navigation.navigate('CompanySetupDashboard');
                  }
                }} 
              />
            </View>
          )}

          {/* Inline Footer inside ScrollView */}
          {step < 6 && (
            <View style={{ marginTop: 24, marginBottom: 16, flexDirection: 'row', gap: 12 }}>
              {step > 1 && (
                <Button label="Back" variant="outline" onPress={handleBack} style={{ flex: 1 }} size="lg" />
              )}
              {step < 5 ? (
                <Button label="Continue" variant="primary" onPress={handleNext} style={{ flex: 2 }} size="lg" />
              ) : (
                <Button 
                  label={isEditMode ? "Save Changes" : "Create Workspace"} 
                  variant="primary" 
                  onPress={handleSubmit(onSubmit)} 
                  loading={isEditMode ? updateCompanyMutation.isPending : createCompanyMutation.isPending}
                  style={{ flex: 2 }} 
                  size="lg"
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  cardContent: { padding: 16 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between'
  },
  stepItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    position: 'relative'
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
    zIndex: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 11,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: 1,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  summarySection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  summaryValue: { color: '#0F172A', fontWeight: '500' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  successIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
