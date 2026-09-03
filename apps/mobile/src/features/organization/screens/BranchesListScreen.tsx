import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { AppIcon } from '../../../shared/components/AppIcon';
import { Button } from '../../../shared/components/Button';
import { api, setTenantOverride } from '../../../shared/services/api';
import { useAuthStore } from '../../auth/stores/authStore';

export function BranchesListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const role = useAuthStore(s => s.user?.role);
  const canImpersonate = role === 'SUPER_ADMIN' || role === 'MASTER_SUPER_ADMIN';
  
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (canImpersonate) {
      loadCompanies();
    }
  }, [canImpersonate]);

  useEffect(() => {
    setTenantOverride(selectedCompanyId);
    loadData();
    return () => setTenantOverride(null);
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data.data || res.data);
    } catch (e) {
      console.warn('Failed to load companies', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const bRes = await api.get('/branches');
      setBranches(bRes.data.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const renderBranch = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface.card }]}
      onPress={() => navigation.navigate('BranchForm', { branch: item })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>{item.name}</Text>
          {item.isHq && (
            <View style={{ backgroundColor: theme.colors.brand.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
              <Text style={{ color: theme.colors.brand.primary, fontSize: 10, fontWeight: 'bold' }}>HQ</Text>
            </View>
          )}
        </View>
        {item.address ? <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4 }]}>{item.address}</Text> : null}
      </View>
      <AppIcon name="chevronRight" size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {canImpersonate && companies.length > 0 && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.surface.border, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginBottom: 8, fontWeight: '600' }]}>MANAGE BRANCHES FOR TENANT:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: selectedCompanyId === null ? theme.colors.brand.primary : theme.colors.surface.card }
              ]}
              onPress={() => setSelectedCompanyId(null)}
            >
              <Text style={{ color: selectedCompanyId === null ? '#fff' : theme.colors.text.primary, fontWeight: '600' }}>My Company</Text>
            </TouchableOpacity>
            {companies.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  { backgroundColor: selectedCompanyId === c.id ? theme.colors.brand.primary : theme.colors.surface.card }
                ]}
                onPress={() => setSelectedCompanyId(c.id)}
              >
                <Text style={{ color: selectedCompanyId === c.id ? '#fff' : theme.colors.text.primary, fontWeight: '600' }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={branches}
        keyExtractor={item => item.id}
        renderItem={renderBranch}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: theme.colors.text.tertiary }}>No branches found.</Text>}
      />

      <View style={[styles.fabContainer, { backgroundColor: theme.colors.surface.background }]}>
        <Button label="Add Branch" onPress={() => navigation.navigate('BranchForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  fabContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' }
});
