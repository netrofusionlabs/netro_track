import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { AppIcon } from '../../../shared/components/AppIcon';
import { Button } from '../../../shared/components/Button';
import { api } from '../../../shared/services/api';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { useCompanies } from '../../companies/hooks/useCompanies';

export function OrganizationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const permissions = usePermissions();
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCompanyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = permissions.isSuperAdmin && selectedCompanyId ? { companyId: selectedCompanyId } : undefined;
      const dRes = await api.get('/departments', { params });
      setDepartments(dRes.data.data || dRes.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const targetCompanyId = permissions.isSuperAdmin ? selectedCompanyId : undefined;
    navigation.navigate('DepartmentForm', { targetCompanyId });
  };

  const renderDepartment = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface.card }]}
      onPress={() => navigation.navigate('DepartmentForm', { department: item })}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>{item.name}</Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>
          {item.branch?.name || 'Global'}
        </Text>
      </View>
      <AppIcon name="chevronRight" size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {permissions.isSuperAdmin && (
        <View style={{ padding: 16, backgroundColor: theme.colors.surface.card, borderBottomWidth: 1, borderBottomColor: theme.colors.surface.border }}>
          <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 8 }]}>
            Viewing Departments For:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.companyChip,
                { borderColor: selectedCompanyId === '' ? theme.colors.brand.primary : theme.colors.surface.border },
                selectedCompanyId === '' && { backgroundColor: theme.colors.brand.primaryLight }
              ]}
              onPress={() => setSelectedCompanyId('')}
            >
              <Text style={[typography.bodySm, { color: selectedCompanyId === '' ? theme.colors.brand.primary : theme.colors.text.primary, fontWeight: selectedCompanyId === '' ? '700' : '500' }]}>
                My Company (Default)
              </Text>
            </TouchableOpacity>
            {companies.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.companyChip,
                  { borderColor: selectedCompanyId === c.id ? theme.colors.brand.primary : theme.colors.surface.border },
                  selectedCompanyId === c.id && { backgroundColor: theme.colors.brand.primaryLight }
                ]}
                onPress={() => setSelectedCompanyId(c.id)}
              >
                <Text style={[typography.bodySm, { color: selectedCompanyId === c.id ? theme.colors.brand.primary : theme.colors.text.primary, fontWeight: selectedCompanyId === c.id ? '700' : '500' }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={departments}
        keyExtractor={item => item.id}
        renderItem={renderDepartment}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: theme.colors.text.tertiary }}>No departments found.</Text>}
      />

      <View style={[styles.fabContainer, { backgroundColor: theme.colors.surface.background }]}>
        <Button label="Add Department" onPress={handleCreate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  card: { padding: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  fabContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  companyChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 }
});
