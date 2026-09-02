import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { typography } from '../shared/theme/typography';
import { useAuthStore } from '../features/auth/stores/authStore';
import { AppIcon, AppIconName } from '../shared/components/AppIcon';
import { BrandLogo, Button } from '../shared/components';
import { GlobalHeader } from '../shared/components/GlobalHeader';

// ── Feature screens ──────────────────────────────────────────────────────────
import { AttendanceScreen } from '../features/attendance/AttendanceScreen';
import { AttendanceHistoryScreen } from '../features/attendance/AttendanceHistoryScreen';
import { VisitsScreen } from '../features/visits/VisitsScreen';
import { NewVisitScreen } from '../features/visits/NewVisitScreen';
import { SalesScreen } from '../features/sales/SalesScreen';
import { NewSaleScreen } from '../features/sales/NewSaleScreen';
import { InspectionsScreen } from '../features/inspections/InspectionsScreen';
import { NewInspectionScreen } from '../features/inspections/NewInspectionScreen';
import { CustomerListScreen } from '../features/customers/CustomerListScreen';
import { UserManagementScreen } from '../features/employees/screens/UserManagementScreen';
import { AddUserScreen } from '../features/employees/screens/AddUserScreen';
import { EditUserScreen } from '../features/employees/screens/EditUserScreen';
import { CompanyManagementScreen } from '../features/companies/screens/CompanyManagementScreen';
import { CompanyWizardScreen } from '../features/companies/screens/CompanyWizardScreen';
import { TenantModulesScreen } from '../features/companies/screens/TenantModulesScreen';
import { EmployeeListScreen } from '../features/employees/EmployeeListScreen';
import { EmployeeDetailScreen } from '../features/employees/EmployeeDetailScreen';
import { OrganizationScreen } from '../features/organization/screens/OrganizationScreen';
import { BranchFormScreen } from '../features/organization/screens/BranchFormScreen';
import { DepartmentFormScreen } from '../features/organization/screens/DepartmentFormScreen';
import { TeamMapScreen } from '../features/tracking/TeamMapScreen';
import { RoutePlaybackScreen } from '../features/tracking/RoutePlaybackScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { OrgChartScreen } from '../features/employees/screens/OrgChartScreen';
import { AttendancePoliciesScreen } from '../features/attendance/AttendancePoliciesScreen';
import { AttendancePolicyDetailScreen } from '../features/attendance/AttendancePolicyDetailScreen';
import { EditAttendancePolicyScreen } from '../features/attendance/EditAttendancePolicyScreen';
import { PunchFormScreen } from '../features/attendance/PunchFormScreen';
import { NewRegularizationScreen } from '../features/attendance/NewRegularizationScreen';
import { ManagerRegularizationsScreen } from '../features/attendance/ManagerRegularizationsScreen';
import { BranchesListScreen } from '../features/organization/screens/BranchesListScreen';
import { ConfigurationsScreen } from './ConfigurationsScreen';
import { MoreScreen } from './MoreScreen';

// ── Dashboards ────────────────────────────────────────────────────────────────
import { EmployeeDashboard } from '../features/dashboard/screens/EmployeeDashboard';
import { ManagerDashboard } from '../features/dashboard/screens/ManagerDashboard';
import { AdminDashboard } from '../features/dashboard/screens/AdminDashboard';
import { ProductsScreen } from '../features/products/screens/ProductsScreen';
import { ReportsScreen } from '../features/reports/ReportsScreen';

const Tab = createBottomTabNavigator();
const AttendanceStack = createStackNavigator();
const EmployeesStack = createStackNavigator();
const VisitsStack = createStackNavigator();
const SalesStack = createStackNavigator();
const InspectionsStack = createStackNavigator();
const OrganizationStack = createStackNavigator();
const ApprovalsStack = createStackNavigator();
const CompanyManagementStack = createStackNavigator();

type AppRole = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'COMPANY_ADMIN' | 'SUPER_ADMIN' | 'MASTER_SUPER_ADMIN';

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
  Reports: 'document',
  RoutePlayback: 'teamMap',
  AttendanceHistory: 'history',
  Organization: 'employees',
  Branches: 'building',
  Configurations: 'settings',
  Approvals: 'document',
  Company: 'building',
  OrgChart: 'employees',
  More: 'document',
};

function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase();
  if (
    normalized === 'EMPLOYEE' ||
    normalized === 'MANAGER' ||
    normalized === 'HR' ||
    normalized === 'COMPANY_ADMIN' ||
    normalized === 'SUPER_ADMIN' ||
    normalized === 'MASTER_SUPER_ADMIN'
  ) {
    return normalized as AppRole;
  }
  return null;
}

// ── Approvals Stack ──────────────────────────────────────────────────────────
function ApprovalsStackScreen() {
  const theme = useTheme();
  return (
    <ApprovalsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <ApprovalsStack.Screen
        name="ManagerRegularizations"
        component={ManagerRegularizationsScreen}
        options={{ headerShown: false }}
      />
    </ApprovalsStack.Navigator>
  );
}

// ── Company Management Stack ──────────────────────────────────────────────────
function CompanyManagementStackScreen() {
  const theme = useTheme();
  return (
    <CompanyManagementStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <CompanyManagementStack.Screen
        name="CompanyManagement"
        component={CompanyManagementScreen}
        options={{ headerShown: false }}
      />
      <CompanyManagementStack.Screen
        name="CompanyWizard"
        component={CompanyWizardScreen}
        options={{ headerShown: false }}
      />
      <CompanyManagementStack.Screen
        name="TenantModules"
        component={TenantModulesScreen}
        options={{ headerShown: false }}
      />
    </CompanyManagementStack.Navigator>
  );
}

// ── Employees Stack (List → Detail) ──────────────────────────────────────────
function EmployeesStackScreen() {
  const theme = useTheme();
  return (
    <EmployeesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <EmployeesStack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="EditUser"
        component={EditUserScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="CompanyManagement"
        component={CompanyManagementScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="CompanyWizard"
        component={CompanyWizardScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="TenantModules"
        component={TenantModulesScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="EmployeeList"
        component={EmployeeListScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="EmployeeDetail"
        component={EmployeeDetailScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="EmployeeActivityHistory"
        component={AttendanceHistoryScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="RoutePlayback"
        component={RoutePlaybackScreen}
        options={{ title: 'Route Playback', headerShown: false }}
      />
      <EmployeesStack.Screen
        name="OrgChart"
        component={OrgChartScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="AttendancePolicies"
        component={AttendancePoliciesScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="ManagerRegularizations"
        component={ManagerRegularizationsScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="AttendancePolicyDetail"
        component={AttendancePolicyDetailScreen}
        options={{ headerShown: false }}
      />
      <EmployeesStack.Screen
        name="EditAttendancePolicy"
        component={EditAttendancePolicyScreen}
        options={{ headerShown: false }}
      />
    </EmployeesStack.Navigator>
  );
}

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
        options={{ headerShown: false }}
      />
      <AttendanceStack.Screen
        name="RoutePlayback"
        component={RoutePlaybackScreen}
        options={{ title: 'Route Playback', headerShown: false }}
      />
      <AttendanceStack.Screen
        name="PunchForm"
        component={PunchFormScreen}
        options={{ headerShown: false }}
      />
      <AttendanceStack.Screen
        name="NewRegularization"
        component={NewRegularizationScreen}
        options={{ headerShown: false }}
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
        height: theme.sizes.tabBarHeight + baseBottomPadding,
        paddingBottom: baseBottomPadding,
        paddingTop: 8,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];

        // Skip non-visible screens
        if (options.tabBarItemStyle?.display === 'none' || options.tabBarButton === null) {
          return null;
        }

        const isFocused = state.index === index;
        const isUnreleased = route.name === 'Sales' || route.name === 'Inspections' || route.name === 'Reports' || route.name === 'Customers' || route.name === 'Products';

        const onPress = () => {
          if (isUnreleased) {
            Alert.alert(
              'Feature Coming Soon',
              `${options.tabBarLabel ?? route.name} is currently in active development and will be released in an upcoming update.`
            );
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (route.name === 'Employees') {
              navigation.navigate('Employees', { screen: 'UserManagement' });
            } else if (route.name === 'Attendance') {
              navigation.navigate('Attendance', { screen: 'AttendanceToday' });
            } else if (route.name === 'Approvals') {
              navigation.navigate('Approvals', { screen: 'ManagerRegularizations' });
            } else if (route.name === 'Company') {
              navigation.navigate('Company', { screen: 'CompanyManagement' });
            } else {
              navigation.navigate(route.name);
            }
          } else if (isFocused && !event.defaultPrevented) {
            // Pop to top of the stack if the tab is already focused
            const state = navigation.getState();
            const tabRoute = state.routes[index];
            if (tabRoute.state && tabRoute.state.index > 0) {
              const rootScreenName =
                route.name === 'Employees' ? 'UserManagement' :
                route.name === 'Attendance' ? 'AttendanceToday' :
                route.name === 'Approvals' ? 'ManagerRegularizations' :
                route.name === 'Company' ? 'CompanyManagement' :
                tabRoute.state.routes[0].name;

              navigation.navigate(route.name, {
                screen: rootScreenName,
              });
            }
          }
        };

        const label = options.tabBarLabel ?? route.name;
        const activeColor = theme.colors.brand.primary;
        const inactiveColor = isUnreleased ? theme.colors.text.tertiary : theme.colors.text.secondary;
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
              paddingVertical: 6,
              paddingHorizontal: 2,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: isFocused ? theme.colors.surface.subtle : 'transparent',
              opacity: isUnreleased ? 0.4 : 1,
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
                  fontSize: isUnreleased ? 10 : 11,
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

function useRoleTabBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (props: any) => (
    <CustomBottomTabBar {...props} insets={insets} theme={theme} />
  );
}

function OrganizationStackScreen() {
  const theme = useTheme();
  return (
    <OrganizationStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <OrganizationStack.Screen name="Organization" component={OrganizationScreen} options={{ title: 'Departments' }} />
      <OrganizationStack.Screen name="BranchForm" component={BranchFormScreen} options={{ title: 'Branch' }} />
      <OrganizationStack.Screen name="DepartmentForm" component={DepartmentFormScreen} options={{ title: 'Department' }} />
    </OrganizationStack.Navigator>
  );
}

function BranchesStackScreen() {
  const theme = useTheme();
  return (
    <OrganizationStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface.card },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <OrganizationStack.Screen name="BranchesList" component={BranchesListScreen} options={{ title: 'Branches' }} />
      <OrganizationStack.Screen name="BranchForm" component={BranchFormScreen} options={{ title: 'Branch' }} />
    </OrganizationStack.Navigator>
  );
}

// ── Activity stacks for field employees (list → create) ──────────────────────
function VisitsStackScreen() {
  const theme = useTheme();
  return (
    <VisitsStack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface.card }, headerTintColor: theme.colors.text.primary, headerTitleStyle: { fontWeight: '600' } }}>
      <VisitsStack.Screen name="VisitsList" component={VisitsScreen} options={{ headerShown: false }} />
      <VisitsStack.Screen name="NewVisit" component={NewVisitScreen} options={{ headerShown: false }} />
    </VisitsStack.Navigator>
  );
}

function SalesStackScreen() {
  const theme = useTheme();
  return (
    <SalesStack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface.card }, headerTintColor: theme.colors.text.primary, headerTitleStyle: { fontWeight: '600' } }}>
      <SalesStack.Screen name="SalesList" component={SalesScreen} options={{ headerShown: false }} />
      <SalesStack.Screen name="NewSale" component={NewSaleScreen} options={{ headerShown: false }} />
    </SalesStack.Navigator>
  );
}

function InspectionsStackScreen() {
  const theme = useTheme();
  return (
    <InspectionsStack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface.card }, headerTintColor: theme.colors.text.primary, headerTitleStyle: { fontWeight: '600' } }}>
      <InspectionsStack.Screen name="InspectionsList" component={InspectionsScreen} options={{ headerShown: false }} />
      <InspectionsStack.Screen name="NewInspection" component={NewInspectionScreen} options={{ headerShown: false }} />
    </InspectionsStack.Navigator>
  );
}

// ── Role Tab Navigators ──────────────────────────────────────────────────────

// Generic list of hidden screens needed for proper stack routing
const hiddenScreens = [
  { name: 'Profile', component: ProfileScreen },
  { name: 'RoutePlayback', component: RoutePlaybackScreen },
  { name: 'Branches', component: BranchesStackScreen },
  { name: 'Organization', component: OrganizationStackScreen },
  { name: 'Customers', component: CustomerListScreen },
  { name: 'Reports', component: ReportsScreen },
  { name: 'Products', component: ProductsScreen },
  { name: 'Sales', component: SalesScreen },
  { name: 'Inspections', component: InspectionsScreen },
  { name: 'AttendanceHistory', component: AttendanceHistoryScreen },
];

function FieldEmployeeTabs() {
  const tabBar = useRoleTabBar();
  return (
    <Tab.Navigator tabBar={tabBar} initialRouteName="Home" screenOptions={{ headerShown: false }} backBehavior="history">
      <Tab.Screen name="Home" component={EmployeeDashboard} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="OrgChart" component={OrgChartScreen} options={{ tabBarLabel: 'Org Chart' }} />
      <Tab.Screen name="Attendance" component={AttendanceStackScreen} options={{ tabBarLabel: 'Attendance' }} />
      <Tab.Screen name="Visits" component={VisitsStackScreen} options={{ tabBarLabel: 'Visits' }} />

      {hiddenScreens.map((s) => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      ))}
      <Tab.Screen name="Employees" component={EmployeesStackScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="TeamMap" component={TeamMapScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  const tabBar = useRoleTabBar();
  return (
    <Tab.Navigator tabBar={tabBar} initialRouteName="Home" screenOptions={{ headerShown: false }} backBehavior="history">
      <Tab.Screen name="Home" component={ManagerDashboard} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Employees" component={EmployeesStackScreen} options={{ tabBarLabel: 'People' }} />
      <Tab.Screen name="Attendance" component={AttendanceStackScreen} options={{ tabBarLabel: 'Attendance' }} />
      <Tab.Screen name="Approvals" component={ApprovalsStackScreen} options={{ tabBarLabel: 'Approvals' }} />

      {hiddenScreens.map((s) => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      ))}
      <Tab.Screen name="TeamMap" component={TeamMapScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Visits" component={VisitsStackScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="OrgChart" component={OrgChartScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

function TenantAdminTabs() {
  const tabBar = useRoleTabBar();
  return (
    <Tab.Navigator tabBar={tabBar} initialRouteName="Home" screenOptions={{ headerShown: false }} backBehavior="history">
      <Tab.Screen name="Home" component={AdminDashboard} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Employees" component={EmployeesStackScreen} options={{ tabBarLabel: 'People' }} />
      <Tab.Screen name="Attendance" component={AttendanceStackScreen} options={{ tabBarLabel: 'Attendance' }} />
      <Tab.Screen name="Configurations" component={ConfigurationsScreen} options={{ tabBarLabel: 'Configs' }} />
      <Tab.Screen name="Approvals" component={ApprovalsStackScreen} options={{ tabBarLabel: 'Approvals' }} />

      {hiddenScreens.map((s) => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      ))}
      <Tab.Screen name="TeamMap" component={TeamMapScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Visits" component={VisitsStackScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="OrgChart" component={OrgChartScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

function SuperAdminTabs() {
  const tabBar = useRoleTabBar();
  return (
    <Tab.Navigator tabBar={tabBar} initialRouteName="Home" screenOptions={{ headerShown: false }} backBehavior="history">
      <Tab.Screen name="Home" component={AdminDashboard} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Company" component={CompanyManagementStackScreen} options={{ tabBarLabel: 'Companies' }} />
      <Tab.Screen name="Employees" component={EmployeesStackScreen} options={{ tabBarLabel: 'People' }} />
      <Tab.Screen name="Configurations" component={ConfigurationsScreen} options={{ tabBarLabel: 'Configs' }} />
      <Tab.Screen name="Approvals" component={ApprovalsStackScreen} options={{ tabBarLabel: 'Approvals' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />

      {hiddenScreens.map((s) => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      ))}
      <Tab.Screen name="Visits" component={VisitsStackScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Attendance" component={AttendanceStackScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="OrgChart" component={OrgChartScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="TeamMap" component={TeamMapScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

function UnsupportedRoleScreen() {
  const theme = useTheme();
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  const role = useAuthStore((s) => s.user?.role);

  return (
    <View style={[styles.fallback, { backgroundColor: theme.colors.surface.background }]}>
      <BrandLogo variant="banner" size={240} />
      <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginTop: 24, textAlign: 'center' }]}>
        Account role not supported
      </Text>
      <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8, textAlign: 'center' }]}>
        {role
          ? `Role "${role}" does not have a mobile workspace yet. Sign in with a supported account.`
          : 'Your account is missing a role. Please sign in again.'}
      </Text>
      <Button
        label="Sign Out"
        onPress={clearCredentials}
        variant="outline"
        size="lg"
        fullWidth
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

// ── Role Tab Navigator ────────────────────────────────────────────────────────
export function RoleNavigator({ navigation }: any) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);

  let tabs: React.ReactNode;
  if (role === 'EMPLOYEE') {
    tabs = <FieldEmployeeTabs />;
  } else if (role === 'MANAGER' || role === 'HR') {
    tabs = <ManagerTabs />;
  } else if (role === 'COMPANY_ADMIN') {
    tabs = <TenantAdminTabs />;
  } else if (role === 'SUPER_ADMIN' || role === 'MASTER_SUPER_ADMIN') {
    tabs = <SuperAdminTabs />;
  } else {
    tabs = <UnsupportedRoleScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.background }}>
      <GlobalHeader navigation={navigation} />
      {tabs}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
