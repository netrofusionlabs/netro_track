import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Button, Card, SearchInput, AppIcon } from '../../../shared/components';
import { useCreateCompany } from '../hooks/useCompanies';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCompanyModal({ visible, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const createCompanyMutation = useCreateCompany();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isGpsEnabled, setIsGpsEnabled] = useState(true);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Company Name is required');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Validation Error', 'Company Code is required (e.g. NETRO, ACME)');
      return;
    }

    try {
      await createCompanyMutation.mutateAsync({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        isGpsEnabled,
      });
      setName('');
      setCode('');
      setIsGpsEnabled(true);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create company. Please check company code uniqueness.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface.card }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headingLg, { color: theme.colors.text.primary }]}>
                Register New Company
              </Text>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                Provision tenant workspace for multi-tenant platform
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" color={theme.colors.text.secondary} size={20} />
            </TouchableOpacity>
          </View>

          <Card variant="outlined" style={{ padding: 14 }}>
            <Text style={[typography.label, { color: theme.colors.text.primary }]}>
              Company Name *
            </Text>
            <SearchInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Acme Global Services"
            />

            <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
              Company Code / Prefix * (Unique)
            </Text>
            <SearchInput
              value={code}
              onChangeText={(txt) => setCode(txt.toUpperCase())}
              placeholder="e.g. ACME, AGRI, TECH"
            />

            {/* GPS Tracking Option */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                  Enable GPS Tracking for Company?
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  {isGpsEnabled
                    ? 'GPS routes & live map enabled for tracked users.'
                    : 'Simple Punch-In / Out mode only (No GPS coordinates recorded).'}
                </Text>
              </View>
              <Switch
                value={isGpsEnabled}
                onValueChange={setIsGpsEnabled}
                trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
              />
            </View>
          </Card>

          <View style={styles.actionsRow}>
            <Button label="Cancel" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
            <Button
              label="Create Company"
              variant="primary"
              onPress={handleCreate}
              loading={createCompanyMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
