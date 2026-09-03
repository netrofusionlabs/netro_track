import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { typography } from '../shared/theme/typography';
import { useAuthStore } from '../features/auth/stores/authStore';
import { AppIcon, AppIconName } from '../shared/components/AppIcon';

type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'COMPANY_ADMIN' | 'SUPER_ADMIN' | 'MASTER_SUPER_ADMIN';

interface MoreMenuItem {
  label: string;
  icon: AppIconName;
  roles: Role[];
  permission?: string;
  moduleSlug?: string;
  unreleased?: boolean;
  onPress: (navigation: any) => void;
}

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  {
    label: 'Live Map',
    icon: 'teamMap',
    permission: 'tracking.live_map.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    onPress: (nav) => nav.navigate('TeamMap'),
  },
  {
    label: 'Org Chart',
    icon: 'employees',
    permission: 'workforce.org_chart.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'],
    onPress: (nav) => nav.navigate('OrgChart'),
  },
  {
    label: 'Reports',
    icon: 'document',
    permission: 'reports.analytics.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    onPress: (nav) => nav.navigate('Reports'),
  },
  {
    label: 'Clients',
    icon: 'customers',
    permission: 'customers.accounts.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Customers'),
  },
  {
    label: 'Products',
    icon: 'products',
    permission: 'products.catalogue.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Products'),
  },
  {
    label: 'Visits',
    icon: 'visits',
    permission: 'visits.records.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Visits'),
  },
  {
    label: 'Sales',
    icon: 'sales',
    permission: 'sales.orders.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Sales'),
  },
  {
    label: 'Inspections',
    icon: 'inspect',
    permission: 'inspections.audits.view',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Inspections'),
  },
];

export function MoreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as Role;
  const userPermissions = user?.permissions || [];

  const visibleItems = MORE_MENU_ITEMS.filter((item) => {
    if (user?.role === 'MASTER_SUPER_ADMIN') return true;
    if (item.permission) {
      if (userPermissions.includes(item.permission)) return true;
      if (item.permission.endsWith('.*')) {
        const prefix = item.permission.slice(0, -1);
        return userPermissions.some((p) => p.startsWith(prefix));
      }
    }
    if (item.moduleSlug) {
      const prefix = `${item.moduleSlug}.`;
      if (userPermissions.some((p) => p.startsWith(prefix) || p === item.moduleSlug)) return true;
    }
    return item.roles.includes(role);
  });

  if (visibleItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface.background, justifyContent: 'center', alignItems: 'center' }]}>
         <Text style={[typography.bodyMd, { color: theme.colors.text.secondary }]}>No additional modules available.</Text>
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
          More Modules
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
          {visibleItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.itemRow,
                index < visibleItems.length - 1 && { borderBottomColor: theme.colors.surface.border, borderBottomWidth: 1 },
              ]}
              onPress={() => {
                if (item.unreleased) {
                  Alert.alert(
                    'Feature Coming Soon',
                    `${item.label} module is currently in active development and will be released in an upcoming update.`
                  );
                } else {
                  item.onPress(navigation);
                }
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface.subtle }]}>
                <AppIcon name={item.icon} size={20} color={item.unreleased ? theme.colors.text.tertiary : theme.colors.brand.primary} />
              </View>
              <Text style={[typography.bodyMd, { color: item.unreleased ? theme.colors.text.tertiary : theme.colors.text.primary, flex: 1 }]}>
                {item.label} {item.unreleased && <Text style={{ fontSize: 10 }}>(Soon)</Text>}
              </Text>
              <AppIcon name="chevronRight" size={16} color={theme.colors.text.tertiary} />
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
