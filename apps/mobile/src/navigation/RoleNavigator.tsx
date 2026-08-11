import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { typography } from '../shared/theme/typography';
import { useAuthStore } from '../features/auth/stores/authStore';
import { AppIcon, AppIconName } from '../shared/components/AppIcon';
import { GlobalHeader } from '../shared/components/GlobalHeader';

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
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';

// ── Dashboards ────────────────────────────────────────────────────────────────
import { EmployeeDashboard } from '../features/dashboard/screens/EmployeeDashboard';
import { ManagerDashboard } from '../features/dashboard/screens/ManagerDashboard';
import { AdminDashboard } from '../features/dashboard/screens/AdminDashboard';
import { ProductsScreen } from '../features/products/screens/ProductsScreen';

const Tab = createBottomTabNavigator();
const AttendanceStack = createStackNavigator();

/** Maps navigation route names to semantic AppIcon names */
const ROUTE_ICON_MAP: Record<string, AppIconName> = {
  Home: 'home',
  Attendance: 'attendance',
  Visits: 'visits',
  Sales: 'sales',
  Inspections: 'inspect',
  Profile: 'profile',
  TeamMap: 'teamMap',
  Employees: 'employees',
  Customers: 'customers',
  Products: 'products',
  RoutePlayback: 'teamMap',
  AttendanceHistory: 'history',
};

// ── Attendance Stack (Home → History) ────────────────────────────────────────
function AttendanceStackScreen() {
  const theme = useTheme();
  return (
    <AttendanceStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <AttendanceStack.Screen
        name="AttendanceToday"
        component={AttendanceScreen}
        options={{ headerShown: false }}
      />
      <AttendanceStack.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: 'History' }}
      />
    </AttendanceStack.Navigator>
  );
}

// ── Custom Bottom Tab Bar Component ─────────────────────────────────────────
function CustomBottomTabBar({ state, descriptors, navigation, insets, theme }: any) {
  const baseBottomPadding = Platform.OS === 'ios'
    ? (insets.bottom > 0 ? insets.bottom : 12)
    : (insets.bottom > 0 ? insets.bottom + 2 : 6);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface.card,
        borderTopColor: theme.colors.surface.border,
        borderTopWidth: 1,
        height: 56 + baseBottomPadding,
        paddingBottom: baseBottomPadding,
        paddingTop: 6,
        paddingHorizontal: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];

        // Skip non-visible screens
        if (options.tabBarItemStyle?.display === 'none' || options.tabBarButton === null) {
          return null;
        }

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const label = options.tabBarLabel ?? route.name;
        const activeColor = theme.colors.brand.primary;
        const inactiveColor = theme.colors.text.secondary;
        const iconName = ROUTE_ICON_MAP[route.name] ?? 'home';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
              paddingHorizontal: 2,
              borderRadius: theme.borderRadius.md,
              backgroundColor: isFocused ? theme.colors.brand.primaryLight : 'transparent',
            }}
            activeOpacity={0.8}
          >
            <AppIcon
              name={iconName}
              color={isFocused ? activeColor : inactiveColor}
              size={20}
            />
            <Text
              numberOfLines={1}
              style={[
                typography.tabLabel,
                {
                  color: isFocused ? activeColor : inactiveColor,
                  fontWeight: isFocused ? '600' : '500',
                  marginTop: 2,
                  textAlign: 'center',
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Role Tab Navigator ────────────────────────────────────────────────────────
export function RoleNavigator({ navigation }: any) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const role = user?.role;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.background }}>
      {/* Global Top Bar Header rendered for ALL screens, displaying logged user company name */}
      <GlobalHeader navigation={navigation} />

      <Tab.Navigator
        tabBar={(props) => <CustomBottomTabBar {...props} insets={insets} theme={theme} />}
        screenOptions={{ headerShown: false }}
      >
        {/* ── FIELD_EMPLOYEE ─────────────────────────────────────────────────── */}
        {role === 'FIELD_EMPLOYEE' && (
          <>
            <Tab.Screen
              name="Home"
              component={EmployeeDashboard}
              options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
              name="Attendance"
              component={AttendanceStackScreen}
              options={{ tabBarLabel: 'Attendance' }}
            />
            <Tab.Screen
              name="Visits"
              component={VisitsScreen}
              options={{ tabBarLabel: 'Visits' }}
            />
            <Tab.Screen
              name="Sales"
              component={SalesScreen}
              options={{ tabBarLabel: 'Sales' }}
            />
            <Tab.Screen
              name="Inspections"
              component={InspectionsScreen}
              options={{ tabBarLabel: 'Inspect' }}
            />
            {/* Hidden screens navigable from dashboard quick-actions */}
            <Tab.Screen
              name="Customers"
              component={CustomerListScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'Customers' }}
            />
            <Tab.Screen
              name="AttendanceHistory"
              component={AttendanceHistoryScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'History' }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ tabBarLabel: 'Profile' }}
            />
          </>
        )}

        {/* ── MANAGER ────────────────────────────────────────────────────────── */}
        {role === 'MANAGER' && (
          <>
            <Tab.Screen
              name="Home"
              component={ManagerDashboard}
              options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
              name="TeamMap"
              component={TeamMapScreen}
              options={{ tabBarLabel: 'Live Map' }}
            />
            <Tab.Screen
              name="Employees"
              component={EmployeeListScreen}
              options={{ tabBarLabel: 'Agents' }}
            />
            <Tab.Screen
              name="Visits"
              component={VisitsScreen}
              options={{ tabBarLabel: 'Visits' }}
            />
            <Tab.Screen
              name="Sales"
              component={SalesScreen}
              options={{ tabBarLabel: 'Sales' }}
            />
            <Tab.Screen
              name="RoutePlayback"
              component={RoutePlaybackScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'Route' }}
            />
            <Tab.Screen
              name="Inspections"
              component={InspectionsScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'Inspections' }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ tabBarLabel: 'Profile' }}
            />
          </>
        )}

        {/* ── COMPANY_ADMIN ───────────────────────────────────────────────────── */}
        {(role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN') && (
          <>
            <Tab.Screen
              name="Home"
              component={AdminDashboard}
              options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
              name="TeamMap"
              component={TeamMapScreen}
              options={{ tabBarLabel: 'Live Map' }}
            />
            <Tab.Screen
              name="Employees"
              component={EmployeeListScreen}
              options={{ tabBarLabel: 'Workforce' }}
            />
            <Tab.Screen
              name="Customers"
              component={CustomerListScreen}
              options={{ tabBarLabel: 'Clients' }}
            />
            <Tab.Screen
              name="Products"
              component={ProductsScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'Products' }}
            />
            <Tab.Screen
              name="Visits"
              component={VisitsScreen}
              options={{ tabBarLabel: 'Visits' }}
            />
            <Tab.Screen
              name="Sales"
              component={SalesScreen}
              options={{ tabBarLabel: 'Sales' }}
            />
            <Tab.Screen
              name="RoutePlayback"
              component={RoutePlaybackScreen}
              options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarLabel: 'Route' }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ tabBarLabel: 'Profile' }}
            />
          </>
        )}
      </Tab.Navigator>
    </View>
  );
}
