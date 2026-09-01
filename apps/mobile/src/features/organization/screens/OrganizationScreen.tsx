import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { AppIcon } from '../../../shared/components/AppIcon';
import { Button } from '../../../shared/components/Button';
import { api } from '../../../shared/services/api';

export function OrganizationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'departments'>('departments');
  
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const dRes = await api.get('/api/v1/departments');
      setDepartments(dRes.data.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load organization data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigation.navigate('DepartmentForm');
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
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'departments' && { borderBottomColor: theme.colors.brand.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab('departments')}>
          <Text style={[typography.bodyMd, { color: activeTab === 'departments' ? theme.colors.brand.primary : theme.colors.text.secondary, fontWeight: activeTab === 'departments' ? '600' : '400' }]}>Departments</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={departments}
        keyExtractor={item => item.id}
        renderItem={renderDepartment}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: theme.colors.text.tertiary }}>No data found.</Text>}
      />

      <View style={[styles.fabContainer, { backgroundColor: theme.colors.surface.background }]}>
        <Button label={`Add Department`} onPress={handleCreate} />
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
});
