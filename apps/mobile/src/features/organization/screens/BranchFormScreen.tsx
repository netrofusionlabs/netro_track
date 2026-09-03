import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { api } from '../../../shared/services/api';

export function BranchFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const branch = route.params?.branch;

  const [name, setName] = useState(branch?.name || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [isHq, setIsHq] = useState(branch?.isHq || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setSaving(true);
    try {
      if (branch) {
        await api.put(`/branches/${branch.id}`, { name, address, isHq });
      } else {
        await api.post(`/branches`, { name, address, isHq });
      }
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save branch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <View style={{ padding: 16 }}>
        <Input label="Branch Name" value={name} onChangeText={setName} placeholder="e.g. New York HQ" />
        <View style={{ height: 16 }} />
        <Input label="Address" value={address} onChangeText={setAddress} placeholder="e.g. 123 Main St" />
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
          <Text style={[typography.bodyMd, { color: theme.colors.text.primary }]}>Set as Headquarters</Text>
          <Switch value={isHq} onValueChange={setIsHq} trackColor={{ true: theme.colors.brand.primary }} />
        </View>
      </View>

      <View style={[styles.fabContainer, { backgroundColor: theme.colors.surface.background }]}>
        <Button label={saving ? 'Saving...' : 'Save Branch'} onPress={handleSave} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fabContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 'auto' },
});
