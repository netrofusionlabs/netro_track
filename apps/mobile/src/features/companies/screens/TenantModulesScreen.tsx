import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Platform, Text } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button, Card, ScreenHeader, LoadingState, AppIcon } from '../../../shared/components';
import { useCompanyDetail, useUpdateCompany } from '../hooks/useCompanies';
import { useNavigation, useRoute } from '@react-navigation/native';
import { typography } from '../../../shared/theme/typography';

const AVAILABLE_MODULES = [
  { key: 'attendance', label: 'Attendance', icon: 'clock', desc: 'Punch-in/out, live shift timesheets, and attendance policies.' },
  { key: 'gps', label: 'GPS Tracking', icon: 'locationPin', desc: 'Track live worker locations, movement breadcrumbs, and route replays during duty.' },
  { key: 'regularization', label: 'Attendance Regularization', icon: 'history', desc: 'Allow field employees to request punch corrections and allow managers to approve them.' },
];

export function TenantModulesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const companyId = route.params?.companyId;

  const { data: company, isLoading } = useCompanyDetail(companyId);
  const updateCompanyMutation = useUpdateCompany();

  const [modules, setModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (company) {
      const initialModules: Record<string, boolean> = {
        attendance: false, leave: false, shift: false, gps: company.isGpsEnabled ?? true,
        payroll: false, expense: false, asset: false, performance: false, recruitment: false, regularization: false
      };
      if (Array.isArray(company.modules)) {
        company.modules.forEach((m: any) => {
          const key = m.module?.toLowerCase();
          if (key && key in initialModules) {
            initialModules[key] = Boolean(m.isEnabled);
          }
        });
      }
      console.log('Mobile TenantModulesScreen -> company modules:', JSON.stringify(company.modules));
      console.log('Mobile TenantModulesScreen -> initialModules computed:', JSON.stringify(initialModules));
      setModules(initialModules);
    }
  }, [company]);

  const handleToggle = (key: string, value: boolean) => {
    setModules(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'attendance' && !value) {
        next.gps = false;
        next.regularization = false;
      }
      return next;
    });
  };

  const handleSave = () => {
    updateCompanyMutation.mutate(
      { id: companyId, data: { modules } },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Tenant access updated successfully');
          navigation.goBack();
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.message || 'Failed to update modules');
        }
      }
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading tenant access..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader title="Tenant Access" onBackPress={() => navigation.goBack()} />
      
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
              Enable or disable modules for this tenant
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={[styles.moduleRow, { borderBottomColor: theme.colors.surface.border, borderBottomWidth: modules['attendance'] ? 1 : 0 }]}>
            <View style={styles.moduleInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.subtle }]}>
                <AppIcon name="clock" color={theme.colors.text.primary} size={20} />
              </View>
              <View style={styles.moduleTexts}>
                <Text style={{ ...typography.headingMd, fontSize: 16, marginBottom: 2, color: theme.colors.text.primary }}>Attendance</Text>
                <Text style={{ ...typography.bodySm, fontSize: 13, color: theme.colors.text.secondary }}>Punch-in/out, live shift timesheets, and attendance policies.</Text>
              </View>
            </View>
            <Switch
              value={modules['attendance'] || false}
              onValueChange={(val) => handleToggle('attendance', val)}
              trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (modules['attendance'] ? '#FFFFFF' : '#f4f3f4')}
            />
          </View>

          {modules['attendance'] && (
            <View style={{ backgroundColor: theme.colors.surface.subtle, paddingLeft: 16, paddingRight: 0 }}>
              <View style={[styles.moduleRow, { borderBottomColor: theme.colors.surface.border, borderBottomWidth: 1, paddingRight: 16 }]}>
                <View style={styles.moduleInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.background }]}>
                    <AppIcon name="locationPin" color={theme.colors.text.primary} size={20} />
                  </View>
                  <View style={styles.moduleTexts}>
                    <Text style={{ ...typography.headingMd, fontSize: 15, marginBottom: 2, color: theme.colors.text.primary }}>GPS Tracking</Text>
                    <Text style={{ ...typography.bodySm, fontSize: 13, color: theme.colors.text.secondary }}>Track live worker locations, movement breadcrumbs, and route replays during duty.</Text>
                  </View>
                </View>
                <Switch
                  value={modules['gps'] || false}
                  onValueChange={(val) => handleToggle('gps', val)}
                  trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (modules['gps'] ? '#FFFFFF' : '#f4f3f4')}
                />
              </View>

              <View style={[styles.moduleRow, { paddingRight: 16 }]}>
                <View style={styles.moduleInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.background }]}>
                    <AppIcon name="history" color={theme.colors.text.primary} size={20} />
                  </View>
                  <View style={styles.moduleTexts}>
                    <Text style={{ ...typography.headingMd, fontSize: 15, marginBottom: 2, color: theme.colors.text.primary }}>Attendance Regularization</Text>
                    <Text style={{ ...typography.bodySm, fontSize: 13, color: theme.colors.text.secondary }}>Allow field employees to request punch corrections and allow managers to approve them.</Text>
                  </View>
                </View>
                <Switch
                  value={modules['regularization'] || false}
                  onValueChange={(val) => handleToggle('regularization', val)}
                  trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (modules['regularization'] ? '#FFFFFF' : '#f4f3f4')}
                />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { 
        backgroundColor: theme.colors.surface.background,
        borderTopColor: theme.colors.surface.border
      }]}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={updateCompanyMutation.isPending}
          disabled={updateCompanyMutation.isPending}
          variant="primary"
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moduleTexts: {
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
});
