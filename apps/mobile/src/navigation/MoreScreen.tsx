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
  unreleased?: boolean;
  onPress: (navigation: any) => void;
}

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  {
    label: 'Live Map',
    icon: 'teamMap',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    onPress: (nav) => nav.navigate('TeamMap'),
  },
  {
    label: 'Org Chart',
    icon: 'employees',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'],
    onPress: (nav) => nav.navigate('OrgChart'),
  },
  {
    label: 'Reports',
    icon: 'document',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    onPress: (nav) => nav.navigate('Reports'),
  },
  {
    label: 'Clients',
    icon: 'customers',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Customers'),
  },
  {
    label: 'Products',
    icon: 'products',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Products'),
  },
  {
    label: 'Visits',
    icon: 'visits',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Visits'),
  },
  {
    label: 'Sales',
    icon: 'sales',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Sales'),
  },
  {
    label: 'Inspections',
    icon: 'inspect',
    roles: ['SUPER_ADMIN', 'MASTER_SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR'],
    unreleased: true,
    onPress: (nav) => nav.navigate('Inspections'),
  },
];

export function MoreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const role = useAuthStore((s) => s.user?.role) as Role;

  const visibleItems = MORE_MENU_ITEMS.filter((item) => item.roles.includes(role));

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
