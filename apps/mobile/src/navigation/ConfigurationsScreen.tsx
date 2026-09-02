import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { typography } from '../shared/theme/typography';
import { useAuthStore } from '../features/auth/stores/authStore';
import { AppIcon, AppIconName } from '../shared/components/AppIcon';

type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'COMPANY_ADMIN' | 'SUPER_ADMIN' | 'MASTER_SUPER_ADMIN';

interface ConfigMenuItem {
  label: string;
  icon: AppIconName;
  roles: Role[];
  onPress: (navigation: any) => void;
}

const CONFIG_MENU_ITEMS: ConfigMenuItem[] = [
  {
    label: 'Policy Configuration',
    icon: 'document',
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'],
    onPress: (nav) => nav.navigate('Employees', { screen: 'AttendancePolicies' }),
  },
  {
    label: 'Branches Configuration',
    icon: 'building',
    roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    onPress: (nav) => nav.navigate('Branches'),
  },
  {
    label: 'Department Setup',
    icon: 'employees',
    roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    onPress: (nav) => nav.navigate('Organization'),
  },
];

export function ConfigurationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const role = useAuthStore((s) => s.user?.role) as Role;

  const visibleItems = CONFIG_MENU_ITEMS.filter((item) => item.roles.includes(role));

  if (visibleItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface.background, justifyContent: 'center', alignItems: 'center' }]}>
         <Text style={[typography.bodyMd, { color: theme.colors.text.secondary }]}>No configurations available for your role.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surface.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 16 }}
    >
      <View style={styles.section}>
        <Text style={[typography.headingSm, { color: theme.colors.text.secondary, marginBottom: 12, paddingHorizontal: 16 }]}>
          Configurations
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
          {visibleItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.itemRow,
                index < visibleItems.length - 1 && { borderBottomColor: theme.colors.surface.border, borderBottomWidth: 1 },
              ]}
              onPress={() => item.onPress(navigation)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.subtle }]}>
                <AppIcon name={item.icon} size={20} color={theme.colors.brand.primary} />
              </View>
              <Text style={[typography.bodyMd, { color: theme.colors.text.primary, flex: 1 }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
});
