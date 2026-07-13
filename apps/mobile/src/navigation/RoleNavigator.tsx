import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuthStore } from '../features/auth/stores/authStore';

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

const Tab = createBottomTabNavigator();
const AttendanceStack = createStackNavigator();

// ── SVG-free tab icons ────────────────────────────────────────────────────────
function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
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
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>Profile</Text>

        <View style={[s.profileCard, { backgroundColor: theme.colors.surface.card }]}>
          <View style={[s.avatar, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <Text style={[s.avatarText, { color: theme.colors.brand.primary }]}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={[s.profileName, { color: theme.colors.text.primary }]}>{user?.name}</Text>
          <View style={[s.roleBadge, { backgroundColor: theme.colors.brand.primaryLight }]}>
            <Text style={[s.roleBadgeText, { color: theme.colors.brand.primary }]}>
              {user?.role?.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={[s.infoCard, { backgroundColor: theme.colors.surface.card }]}>
          <InfoRow label="Employee ID" value={user?.employeeId ?? '—'} theme={theme} />
          <InfoRow label="User ID" value={user?.id ?? '—'} theme={theme} last />
        </View>

        <TouchableOpacity
          onPress={clearCredentials}
          style={[s.logoutBtn, { borderColor: theme.colors.semantic.error }]}
        >
          <Text style={[s.logoutText, { color: theme.colors.semantic.error }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label, value, theme, last
}: { label: string; value: string; theme: ReturnType<typeof useTheme>; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.surface.input }]}>
      <Text style={[s.infoLabel, { color: theme.colors.text.secondary }]}>{label}</Text>
      <Text style={[s.infoValue, { color: theme.colors.text.primary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Employee Dashboard ────────────────────────────────────────────────────────
function EmployeeDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: todayRecord } = useAttendanceToday();
  const { data: todayVisits = [] } = useTodayVisits();
  const { data: todaySales = [] } = useTodaySales();

  const isPunchedIn = !!todayRecord && !todayRecord.punchOutTime;
  const isPunchedOut = !!todayRecord && !!todayRecord.punchOutTime;

  const totalSalesAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount), 0
  );

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>
          Hello, {user?.name?.split(' ')[0] ?? 'Agent'} 👋
        </Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>Field Agent · Today's Overview</Text>

        {/* Attendance status card */}
        <View style={[s.dashCard, { backgroundColor: theme.colors.surface.card }]}>
          <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>Attendance</Text>
          <Text style={{
            color: isPunchedIn
              ? theme.colors.semantic.success
              : isPunchedOut
              ? theme.colors.semantic.info
              : theme.colors.semantic.warning,
            fontWeight: '700', fontSize: 15, marginBottom: 12
          }}>
            {isPunchedIn ? '● Punched In' : isPunchedOut ? '✓ Day Complete' : '○ Not Punched In'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Attendance')}
            style={[s.cardAction, { backgroundColor: theme.colors.brand.primary }]}
          >
            <Text style={s.cardActionText}>
              {isPunchedIn ? 'Punch Out' : isPunchedOut ? 'View Record' : 'Punch In Now'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.brand.primary }]}>{todayVisits.length}</Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Visits Today</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.semantic.success }]}>{todaySales.length}</Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Sales Today</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.brand.secondary }]}>
              ₹{Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Revenue</Text>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={[s.sectionTitle, { color: theme.colors.text.secondary }]}>QUICK ACTIONS</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Log Visit', icon: '📍', screen: 'Visits' },
            { label: 'Record Sale', icon: '💼', screen: 'Sales' },
            { label: 'Inspection', icon: '🔍', screen: 'Inspections' },
            { label: 'History', icon: '📋', screen: 'AttendanceHistory' }
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => navigation.navigate(action.screen)}
              style={[s.actionCard, { backgroundColor: theme.colors.surface.card }]}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{action.icon}</Text>
              <Text style={[s.actionLabel, { color: theme.colors.text.primary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Manager Dashboard ─────────────────────────────────────────────────────────
function ManagerDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: todayVisits = [] } = useTodayVisits();
  const { data: todaySales = [] } = useTodaySales();
  const { data: todayInspections = [] } = useTodayInspections();

  const totalSalesAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount), 0
  );

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>
          Hello, {user?.name?.split(' ')[0] ?? 'Manager'} 👋
        </Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>Team Supervisor · Today's Overview</Text>

        {/* Team metrics */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.brand.primary }]}>{todayVisits.length}</Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Team Visits</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.semantic.success }]}>{todaySales.length}</Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Team Sales</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[s.statVal, { color: theme.colors.brand.secondary }]}>{todayInspections.length}</Text>
            <Text style={[s.statLabel, { color: theme.colors.text.secondary }]}>Inspections</Text>
          </View>
        </View>

        <View style={[s.dashCard, { backgroundColor: theme.colors.surface.card }]}>
          <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>Revenue Today</Text>
          <Text style={[s.bigVal, { color: theme.colors.semantic.success }]}>
            ₹{Number(totalSalesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>

        <Text style={[s.sectionTitle, { color: theme.colors.text.secondary }]}>QUICK LINKS</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Visits', icon: '📍', screen: 'Visits' },
            { label: 'Sales', icon: '💼', screen: 'Sales' },
            { label: 'Agents', icon: '👥', screen: 'Employees' },
            { label: 'Inspections', icon: '🔍', screen: 'Inspections' }
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => navigation.navigate(a.screen)}
              style={[s.actionCard, { backgroundColor: theme.colors.surface.card }]}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</Text>
              <Text style={[s.actionLabel, { color: theme.colors.text.primary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ navigation }: { navigation: any }) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.heading, { color: theme.colors.text.primary }]}>Admin Portal</Text>
        <Text style={[s.sub, { color: theme.colors.text.secondary }]}>Company Operations Dashboard</Text>

        <View style={[s.dashCard, { backgroundColor: theme.colors.surface.card }]}>
          <Text style={[s.cardTitle, { color: theme.colors.text.primary }]}>System Health</Text>
          <Text style={[{ color: theme.colors.semantic.success, fontWeight: '700' }]}>
            ● Connected — All Services Online
          </Text>
        </View>

        <Text style={[s.sectionTitle, { color: theme.colors.text.secondary }]}>MANAGE</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Workforce', icon: '👥', screen: 'Employees' },
            { label: 'Customers', icon: '🏢', screen: 'Customers' },
            { label: 'Visits', icon: '📍', screen: 'Visits' },
            { label: 'Sales', icon: '💼', screen: 'Sales' }
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => navigation.navigate(a.screen)}
              style={[s.actionCard, { backgroundColor: theme.colors.surface.card }]}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</Text>
              <Text style={[s.actionLabel, { color: theme.colors.text.primary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10
  };

  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarActiveTintColor: theme.colors.brand.primary,
    tabBarInactiveTintColor: theme.colors.text.tertiary,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const, marginTop: -2, paddingBottom: 2 }
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
          {/* Hidden: Route playback accessible from agent detail or dashboard */}
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
            name="Visits"
            component={VisitsScreen}
            options={{ tabBarLabel: 'Visits', tabBarIcon: ({ color }) => <TabIcon symbol="📍" color={color} /> }}
          />
          <Tab.Screen
            name="Sales"
            component={SalesScreen}
            options={{ tabBarLabel: 'Sales', tabBarIcon: ({ color }) => <TabIcon symbol="💼" color={color} /> }}
          />
          {/* Hidden: Route playback accessible from employee detail view */}
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
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.06, marginBottom: 10, marginTop: 8 },
  dashCard: {
    borderRadius: 14, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  cardAction: { borderRadius: 10, padding: 12, alignItems: 'center' },
  cardActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bigVal: { fontSize: 28, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionCard: {
    width: '47%', borderRadius: 14, padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  // Profile
  profileCard: {
    borderRadius: 14, padding: 24, marginBottom: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 30, fontWeight: '800' },
  profileName: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  infoCard: {
    borderRadius: 14, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 }
    })
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 8 },
  logoutBtn: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700' }
});
