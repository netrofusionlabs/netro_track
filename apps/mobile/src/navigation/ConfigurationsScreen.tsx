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
  permission?: string;
  moduleSlug?: string;
  onPress: (navigation: any) => void;
}

const CONFIG_MENU_ITEMS: ConfigMenuItem[] = [
  {
    label: 'Policy Configuration',
    icon: 'document',
    permission: 'custom_policy_management',
    moduleSlug: 'attendance',
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
  {
    label: 'Access Groups & Permissions',
    icon: 'lock',
    permission: 'access_control.groups.view',
    roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'],
    onPress: (nav) => nav.navigate('AccessGroups'),
  },
  {
    label: 'Platform Capabilities',
    icon: 'document',
    roles: ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN'],
    onPress: (nav) => nav.navigate('PlatformCapabilities'),
  },
];

export function ConfigurationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as Role;
  const userPermissions = user?.permissions || [];
  const companyEntitledSlugs = user?.companyEntitledSlugs;

  const isPlatformCompany = user?.companyName?.toLowerCase().includes('netro') ?? false;

  const visibleItems = CONFIG_MENU_ITEMS.filter((item) => {
    // 1. Master super admin sees everything
    if (user?.role === 'MASTER_SUPER_ADMIN') return true;

    // 2. Netro platform super admin sees everything
    if (isPlatformCompany && (user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER_SUPER_ADMIN')) return true;

    // 3. User must have an eligible role
    if (!item.roles.includes(role)) return false;

    // 4. Company Admins & Super Admins have administrative access to their company's core configs
    if (role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN') {
      // If moduleSlug is specified (e.g. attendance for policy), company must be entitled to that module
      if (item.moduleSlug && companyEntitledSlugs && companyEntitledSlugs.length > 0) {
        const prefix = `${item.moduleSlug}.`;
        const hasModule = companyEntitledSlugs.some((s) => s === item.moduleSlug || s.startsWith(prefix));
        if (!hasModule) return false;
      }

      // If specific policy permission is required (e.g. custom_policy_management)
      if (item.permission === 'custom_policy_management' && companyEntitledSlugs && companyEntitledSlugs.length > 0) {
        const hasPolicy = companyEntitledSlugs.some((s) => s === 'custom_policy_management' || s.startsWith('custom_policy_management'));
        if (!hasPolicy) return false;
      }

      // Company admin always has access to Branches, Departments, and Access Groups
      return true;
    }

    // 5. Non-admin roles (e.g. HR): check explicit user permissions
    if (item.permission) {
      if (userPermissions.includes(item.permission)) return true;
      if (item.permission.endsWith('.*')) {
        const prefix = item.permission.slice(0, -1);
        return userPermissions.some((p) => p.startsWith(prefix));
      }
      return false;
    }

    return true;
  });

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
