import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { typography } from '../shared/theme/typography';
import { shadows } from '../shared/theme/shadows';
import { useAuthStore } from '../features/auth/stores/authStore';

// ── Shared components ─────────────────────────────────────────────────────────
import { Card } from '../shared/components/Card';
import { Badge } from '../shared/components/Badge';
import { StatCard } from '../shared/components/StatCard';
import { Divider } from '../shared/components/Divider';

// ── Feature screens ──────────────────────────────────────────────────────────
import { AttendanceScreen } from '../features/attendance/AttendanceScreen';
import { AttendanceHistoryScreen } from '../features/attendance/AttendanceHistoryScreen';
import { VisitsScreen } from '../features/visits/VisitsScreen';
import { SalesScreen } from '../features/sales/SalesScreen';
import { InspectionsScreen } from '../features/inspections/InspectionsScreen';
import { CustomerListScreen } from '../features/customers/CustomerListScreen';
import { EmployeeListScreen } from '../features/employees/EmployeeListScreen';
import { TeamMapScreen } from '../features/tracking/TeamMapScreen';
import { RoutePlaybackScreen } from '../features/tracking/RoutePlaybackScreen';

// ── Dashboard data ────────────────────────────────────────────────────────────
import { useAttendanceToday } from '../features/attendance/hooks/useAttendance';
import { useTodayVisits } from '../features/visits/hooks/useVisits';
import { useTodaySales } from '../features/sales/hooks/useSales';
import { useTodayInspections } from '../features/inspections/hooks/useInspections';

// ── Dashboards ────────────────────────────────────────────────────────────────
import { EmployeeDashboard } from '../features/dashboard/screens/EmployeeDashboard';
import { ManagerDashboard } from '../features/dashboard/screens/ManagerDashboard';
import { AdminDashboard } from '../features/dashboard/screens/AdminDashboard';
import { ProductsScreen } from '../features/products/screens/ProductsScreen';

const Tab = createBottomTabNavigator();
const AttendanceStack = createStackNavigator();

// ── SVG-free tab icons ────────────────────────────────────────────────────────
function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{symbol}</Text>;
}

// ── Attendance Stack (Home → History) ────────────────────────────────────────
function AttendanceStackScreen() {
  const theme = useTheme();
  return (
    <AttendanceStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '700' }
      }}
    >
      <AttendanceStack.Screen
        name="AttendanceToday"
        component={AttendanceScreen}
        options={{ title: 'Attendance' }}
      />
      <AttendanceStack.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: 'History' }}
      />
    </AttendanceStack.Navigator>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[typography.displaySm, { color: theme.colors.text.primary }]}>Profile</Text>

        <Card variant="elevated" style={{ marginTop: 20, alignItems: 'center' as const }}>
          <View style={[s.avatar, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <Text style={[s.avatarText, { color: theme.colors.brand.primary }]}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={[typography.headingLg, { color: theme.colors.text.primary, marginTop: 14 }]}>
            {user?.name}
          </Text>
          <Badge
            label={user?.role?.replace(/_/g, ' ') ?? ''}
            size="md"
            style={{ marginTop: 10 }}
          />
        </Card>

        <Card>
          <View style={s.infoRow}>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>Employee ID</Text>
            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]} numberOfLines={1}>
              {user?.employeeId ?? '—'}
            </Text>
          </View>
          <Divider spacing={0} />
          <View style={s.infoRow}>
            <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>User ID</Text>
            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]} numberOfLines={1}>
              {user?.id ?? '—'}
            </Text>
          </View>
        </Card>

        <TouchableOpacity
          onPress={clearCredentials}
          style={[s.logoutBtn, { borderColor: theme.colors.semantic.error, borderRadius: theme.borderRadius.md }]}
          activeOpacity={0.7}
        >
          <Text style={[typography.button, { color: theme.colors.semantic.error }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Role Tab Navigator ────────────────────────────────────────────────────────
export function RoleNavigator() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const tabBarStyle = {
    backgroundColor: theme.colors.surface.card,
    borderTopColor: theme.colors.surface.input,
    borderTopWidth: 0.5,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    ...shadows.md,
  };

  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarActiveTintColor: theme.colors.brand.primary,
    tabBarInactiveTintColor: theme.colors.text.tertiary,
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700' as const,
      marginTop: -2,
      paddingBottom: 2,
    },
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      {/* ── FIELD_EMPLOYEE ─────────────────────────────────────────────────── */}
      {role === 'FIELD_EMPLOYEE' && (
        <>
          <Tab.Screen
            name="Home"
            component={EmployeeDashboard}
            options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <TabIcon symbol="🏠" color={color} /> }}
          />
          <Tab.Screen
            name="Attendance"
            component={AttendanceStackScreen}
            options={{ tabBarLabel: 'Attendance', tabBarIcon: ({ color }) => <TabIcon symbol="⏱" color={color} /> }}
          />
          <Tab.Screen
            name="Visits"
            component={VisitsScreen}
            options={{ tabBarLabel: 'Visits', tabBarIcon: ({ color }) => <TabIcon symbol="📍" color={color} /> }}
          />
          <Tab.Screen
            name="Sales"
            component={SalesScreen}
            options={{ tabBarLabel: 'Sales', tabBarIcon: ({ color }) => <TabIcon symbol="💼" color={color} /> }}
          />
          <Tab.Screen
            name="Inspections"
            component={InspectionsScreen}
            options={{ tabBarLabel: 'Inspect', tabBarIcon: ({ color }) => <TabIcon symbol="🔍" color={color} /> }}
          />
          {/* Hidden screens navigable from dashboard quick-actions */}
          <Tab.Screen
            name="Customers"
            component={CustomerListScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'Customers' }}
          />
          <Tab.Screen
            name="AttendanceHistory"
            component={AttendanceHistoryScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'History' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} /> }}
          />
        </>
      )}

      {/* ── MANAGER ────────────────────────────────────────────────────────── */}
      {role === 'MANAGER' && (
        <>
          <Tab.Screen
            name="Home"
            component={ManagerDashboard}
            options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon symbol="📊" color={color} /> }}
          />
          <Tab.Screen
            name="TeamMap"
            component={TeamMapScreen}
            options={{ tabBarLabel: 'Live Map', tabBarIcon: ({ color }) => <TabIcon symbol="🗺" color={color} /> }}
          />
          <Tab.Screen
            name="Employees"
            component={EmployeeListScreen}
            options={{ tabBarLabel: 'Agents', tabBarIcon: ({ color }) => <TabIcon symbol="👥" color={color} /> }}
          />
          <Tab.Screen
            name="Visits"
            component={VisitsScreen}
            options={{ tabBarLabel: 'Visits', tabBarIcon: ({ color }) => <TabIcon symbol="📍" color={color} /> }}
          />
          <Tab.Screen
            name="Sales"
            component={SalesScreen}
            options={{ tabBarLabel: 'Sales', tabBarIcon: ({ color }) => <TabIcon symbol="💼" color={color} /> }}
          />
          <Tab.Screen
            name="RoutePlayback"
            component={RoutePlaybackScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'Route' }}
          />
          <Tab.Screen
            name="Inspections"
            component={InspectionsScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'Inspections' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} /> }}
          />
        </>
      )}

      {/* ── COMPANY_ADMIN ───────────────────────────────────────────────────── */}
      {(role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN') && (
        <>
          <Tab.Screen
            name="Home"
            component={AdminDashboard}
            options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon symbol="🏢" color={color} /> }}
          />
          <Tab.Screen
            name="TeamMap"
            component={TeamMapScreen}
            options={{ tabBarLabel: 'Live Map', tabBarIcon: ({ color }) => <TabIcon symbol="🗺" color={color} /> }}
          />
          <Tab.Screen
            name="Employees"
            component={EmployeeListScreen}
            options={{ tabBarLabel: 'Workforce', tabBarIcon: ({ color }) => <TabIcon symbol="👥" color={color} /> }}
          />
          <Tab.Screen
            name="Customers"
            component={CustomerListScreen}
            options={{ tabBarLabel: 'Clients', tabBarIcon: ({ color }) => <TabIcon symbol="🤝" color={color} /> }}
          />
          <Tab.Screen
            name="Products"
            component={ProductsScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'Products' }}
          />
          <Tab.Screen
            name="Visits"
            component={VisitsScreen}
            options={{ tabBarLabel: 'Visits', tabBarIcon: ({ color }) => <TabIcon symbol="📍" color={color} /> }}
          />
          <Tab.Screen
            name="Sales"
            component={SalesScreen}
            options={{ tabBarLabel: 'Sales', tabBarIcon: ({ color }) => <TabIcon symbol="💼" color={color} /> }}
          />
          <Tab.Screen
            name="RoutePlayback"
            component={RoutePlaybackScreen}
            options={{ tabBarButton: () => null, tabBarLabel: 'Route' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} /> }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  // Profile
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtn: {
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
});
