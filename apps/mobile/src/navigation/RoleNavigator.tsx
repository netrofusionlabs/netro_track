import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuthStore } from '../features/auth/stores/authStore';

const Tab = createBottomTabNavigator();

// --- CRISP CSS VECTOR-LIKE ICONS (No native dependencies) ---

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrapper}>
      {/* Roof */}
      <View style={[styles.houseRoof, { borderBottomColor: color }]} />
      {/* Body */}
      <View style={[styles.houseBody, { borderColor: color }]} />
    </View>
  );
}

function ClientsIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrapper}>
      {/* Head */}
      <View style={[styles.personHead, { backgroundColor: color }]} />
      {/* Body */}
      <View style={[styles.personBody, { backgroundColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrapper}>
      {/* Head */}
      <View style={[styles.profileHead, { backgroundColor: color }]} />
      {/* Body */}
      <View style={[styles.profileBody, { backgroundColor: color }]} />
    </View>
  );
}

function DashboardIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconWrapper, styles.gridIcon]}>
      <View style={[styles.gridDot, { backgroundColor: color }]} />
      <View style={[styles.gridDot, { backgroundColor: color }]} />
      <View style={[styles.gridDot, { backgroundColor: color }]} />
      <View style={[styles.gridDot, { backgroundColor: color }]} />
    </View>
  );
}

function WorkforceIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrapper}>
      {/* Person 1 */}
      <View style={[styles.workforceHead1, { backgroundColor: color }]} />
      <View style={[styles.workforceBody1, { backgroundColor: color }]} />
      {/* Person 2 */}
      <View style={[styles.workforceHead2, { backgroundColor: color, opacity: 0.7 }]} />
      <View style={[styles.workforceBody2, { backgroundColor: color, opacity: 0.7 }]} />
    </View>
  );
}

function TeamIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrapper}>
      <View style={[styles.teamBadge, { borderColor: color }]}>
        <View style={[styles.teamInnerLine, { backgroundColor: color }]} />
        <View style={[styles.teamInnerLine2, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// --- PREMIUM SKELETON SCREENS ---

function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: theme.colors.surface.card,
        borderColor: theme.colors.surface.input
      }
    ]}>
      {children}
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{title}</Text>
      <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>{subtitle}</Text>
    </View>
  );
}

// 1. Employee Dashboard
function EmployeeDashboard() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title={`Welcome, ${user?.name || 'Employee'}`} subtitle="Field Agent Dashboard" />

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Attendance Status</Text>
          <Text style={[styles.statusText, { color: theme.colors.semantic.warning }]}>● Not Punched In</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.brand.primary }]}>
            <Text style={styles.buttonText}>Punch In Now</Text>
          </TouchableOpacity>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Today's Targets</Text>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Customer Visits</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>0 / 5 Completed</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Sales Target</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>$0 / $1,000</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// 2. Manager Dashboard
function ManagerDashboard() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title={`Hello, ${user?.name || 'Manager'}`} subtitle="Team Supervisor Dashboard" />

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Live Team Status</Text>
          <Text style={[styles.statusText, { color: theme.colors.brand.primary }]}>● 3 Agents Active Field</Text>
          <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>Last sync: 2 mins ago</Text>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Operational Metrics</Text>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Total Visits Today</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>18 Visits</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Total Sales Completed</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>$4,820</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// 3. Admin Dashboard
function AdminDashboard() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title={`System Admin`} subtitle="Company Operations Portal" />

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Company Directory Summary</Text>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Active Employees</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>12 Users</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={{ color: theme.colors.text.secondary }}>Products in Catalog</Text>
            <Text style={[styles.targetVal, { color: theme.colors.text.primary }]}>48 Catalog SKUs</Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>System Health</Text>
          <Text style={[styles.statusText, { color: theme.colors.semantic.success }]}>● Connected to PostgreSQL (Neon)</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// 4. Employee List
function EmployeeListScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title="Employees" subtitle="Manage corporate workforce" />
        {[
          { id: '1', name: 'John Doe', role: 'FIELD_EMPLOYEE', empId: 'EMP001' },
          { id: '2', name: 'Jane Smith', role: 'FIELD_EMPLOYEE', empId: 'EMP002' },
          { id: '3', name: 'Alex Johnson', role: 'MANAGER', empId: 'MGR001' }
        ].map((emp) => (
          <Card key={emp.id}>
            <View style={styles.listRow}>
              <View>
                <Text style={[styles.listName, { color: theme.colors.text.primary }]}>{emp.name}</Text>
                <Text style={{ color: theme.colors.text.secondary }}>{emp.empId} • {emp.role}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.brand.primaryLight }]}>
                <Text style={{ color: theme.colors.brand.primary, fontSize: 12, fontWeight: '700' }}>Active</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// 5. Customer List
function CustomerListScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title="Customers" subtitle="Verify and track field accounts" />
        {[
          { id: '1', name: 'Metro Agro Agencies', type: 'Dealer', location: 'Central Village' },
          { id: '2', name: 'Apex Farms Ltd', type: 'Corporate Farmer', location: 'West Valley' }
        ].map((cust) => (
          <Card key={cust.id}>
            <View style={styles.listRow}>
              <View>
                <Text style={[styles.listName, { color: theme.colors.text.primary }]}>{cust.name}</Text>
                <Text style={{ color: theme.colors.text.secondary }}>{cust.type} • {cust.location}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// 6. Generic/Profile Screen
function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const clearCredentials = useAuthStore((state) => state.clearCredentials);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView style={styles.screenContainer}>
        <Header title="Profile" subtitle="Manage your account session" />

        <Card>
          <View style={styles.profileDetails}>
            <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>{user?.name}</Text>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>Role: {user?.role}</Text>
            <Text style={{ color: theme.colors.text.tertiary }}>ID: {user?.id}</Text>
          </View>
        </Card>

        <TouchableOpacity
          onPress={clearCredentials}
          style={[styles.logoutButton, { borderColor: theme.colors.semantic.error }]}
        >
          <Text style={[styles.logoutText, { color: theme.colors.semantic.error }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ROLE TAB STACKS ROUTING ---

export function RoleNavigator() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface.card,
          borderTopColor: theme.colors.surface.input,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 10
        },
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
          paddingBottom: 2
        }
      }}
    >
      {/* 1. FIELD_EMPLOYEE TAB Menu */}
      {role === 'FIELD_EMPLOYEE' && (
        <>
          <Tab.Screen
            name="Home"
            component={EmployeeDashboard}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color }) => <HomeIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Customers"
            component={CustomerListScreen}
            options={{
              tabBarLabel: 'Clients',
              tabBarIcon: ({ color }) => <ClientsIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color }) => <ProfileIcon color={color} />
            }}
          />
        </>
      )}

      {/* 2. MANAGER TAB Menu */}
      {role === 'MANAGER' && (
        <>
          <Tab.Screen
            name="Team"
            component={ManagerDashboard}
            options={{
              tabBarLabel: 'Team',
              tabBarIcon: ({ color }) => <TeamIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Employees"
            component={EmployeeListScreen}
            options={{
              tabBarLabel: 'Agents',
              tabBarIcon: ({ color }) => <WorkforceIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color }) => <ProfileIcon color={color} />
            }}
          />
        </>
      )}

      {/* 3. COMPANY_ADMIN TAB Menu */}
      {role === 'COMPANY_ADMIN' && (
        <>
          <Tab.Screen
            name="Dashboard"
            component={AdminDashboard}
            options={{
              tabBarLabel: 'Dashboard',
              tabBarIcon: ({ color }) => <DashboardIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Employees"
            component={EmployeeListScreen}
            options={{
              tabBarLabel: 'Workforce',
              tabBarIcon: ({ color }) => <WorkforceIcon color={color} />
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color }) => <ProfileIcon color={color} />
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  header: {
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10
      },
      android: {
        elevation: 2
      }
    })
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600'
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  targetVal: {
    fontSize: 14,
    fontWeight: '600'
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listName: {
    fontSize: 16,
    fontWeight: '700'
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  profileDetails: {
    alignItems: 'center',
    paddingVertical: 12
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4
  },
  logoutButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 48
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700'
  },
  iconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  houseRoof: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1
  },
  houseBody: {
    width: 12,
    height: 9,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2
  },
  personHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 2
  },
  personBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5
  },
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2
  },
  profileBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6
  },
  gridIcon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 16,
    height: 16,
    justifyContent: 'space-between',
    alignContent: 'space-between'
  },
  gridDot: {
    width: 7,
    height: 7,
    borderRadius: 2
  },
  workforceHead1: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 2,
    left: 4,
    zIndex: 2
  },
  workforceBody1: {
    width: 12,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: 'absolute',
    bottom: 3,
    left: 1,
    zIndex: 2
  },
  workforceHead2: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 4,
    right: 3,
    zIndex: 1
  },
  workforceBody2: {
    width: 12,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: 'absolute',
    bottom: 1,
    right: 0,
    zIndex: 1
  },
  teamBadge: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2
  },
  teamInnerLine: {
    width: 7,
    height: 2,
    borderRadius: 1,
    marginBottom: 2
  },
  teamInnerLine2: {
    width: 7,
    height: 2
  }
});
