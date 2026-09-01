import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { api } from '../../../shared/services/api';
import { typography } from '../../../shared/theme/typography';
import { AppIcon } from '../../../shared/components/AppIcon';

export function DepartmentFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const department = route.params?.department;

  const [name, setName] = useState(department?.name || '');
  const [branchId, setBranchId] = useState<string | null>(department?.branchId || null);
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/v1/branches').then(res => setBranches(res.data.data)).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name, branchId };
      if (department) {
        await api.put(`/api/v1/departments/${department.id}`, payload);
      } else {
        await api.post(`/api/v1/departments`, payload);
      }
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <View style={{ padding: 16 }}>
        <Input label="Department Name" value={name} onChangeText={setName} placeholder="e.g. Sales" />
        
        <View style={{ height: 24 }} />
        <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 8 }]}>Branch</Text>
        
        <TouchableOpacity 
          style={[styles.option, branchId === null && { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primary + '10' }]} 
          onPress={() => setBranchId(null)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMd, { color: theme.colors.text.primary }]}>Global (All Branches)</Text>
          </View>
          {branchId === null && <AppIcon name="check" size={20} color={theme.colors.brand.primary} />}
        </TouchableOpacity>

        {branches.map(b => (
          <TouchableOpacity 
            key={b.id}
            style={[styles.option, branchId === b.id && { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primary + '10' }]} 
            onPress={() => setBranchId(b.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMd, { color: theme.colors.text.primary }]}>{b.name}</Text>
            </View>
            {branchId === b.id && <AppIcon name="check" size={20} color={theme.colors.brand.primary} />}
          </TouchableOpacity>
        ))}

      </View>

      <View style={[styles.fabContainer, { backgroundColor: theme.colors.surface.background }]}>
        <Button label={saving ? 'Saving...' : 'Save Department'} onPress={handleSave} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  option: { padding: 16, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  fabContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 'auto' },
});
