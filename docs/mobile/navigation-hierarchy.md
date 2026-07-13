# Navigation Hierarchy

> **Purpose:** Define all navigators, screens, and navigation flow.
> **Dependencies:** [Mobile Overview](mobile-overview.md), [User Roles](../product/user-roles.md)

---

## Navigator Tree

```
RootNavigator (Stack)
├── SplashScreen
├── AuthNavigator (Stack)
│   ├── LoginScreen
│   ├── MpinScreen
│   ├── MpinSetupScreen
│   └── BiometricSetupScreen
│
├── UserTabNavigator (Bottom Tabs)
│   ├── Home (Stack)
│   │   ├── UserDashboard
│   │   ├── AttendanceHistoryScreen
│   │   └── NotificationsScreen
│   ├── Map (Stack)
│   │   ├── MapScreen
│   │   └── RoutePlaybackScreen
│   ├── + (Quick Action → Bottom Sheet)
│   │   ├── NewVisitScreen
│   │   ├── NewSaleScreen
│   │   └── NewInspectionScreen
│   ├── History (Stack)
│   │   ├── HistoryScreen (tabs: Visits | Sales | Inspections)
│   │   ├── VisitDetailScreen
│   │   ├── SaleDetailScreen
│   │   └── InspectionDetailScreen
│   └── Profile (Stack)
│       ├── ProfileScreen
│       ├── EditProfileScreen
│       └── SettingsScreen
│
├── ManagerTabNavigator (Bottom Tabs)
│   ├── Dashboard → ManagerDashboard
│   ├── Team (Stack)
│   │   ├── TeamListScreen
│   │   ├── EmployeeDetailScreen
│   │   └── EmployeeRouteScreen
│   ├── Map → TeamMapScreen
│   ├── Reports (Stack)
│   │   ├── ReportsScreen
│   │   └── ReportDetailScreen
│   └── Profile → ProfileScreen
│
├── AdminTabNavigator (Bottom Tabs)
│   ├── Dashboard → AdminDashboard
│   ├── Employees (Stack)
│   │   ├── EmployeeListScreen
│   │   ├── EmployeeDetailScreen
│   │   ├── CreateEmployeeScreen
│   │   └── EditEmployeeScreen
│   ├── Reports → ReportsScreen
│   ├── Company (Stack)
│   │   ├── CompanyScreen
│   │   ├── BranchesScreen
│   │   ├── DepartmentsScreen
│   │   ├── DesignationsScreen
│   │   └── CompanySettingsScreen
│   └── Profile → ProfileScreen
│
└── SuperAdminTabNavigator (Bottom Tabs)
    ├── Dashboard → SuperAdminDashboard
    ├── Companies (Stack)
    │   ├── CompanyListScreen
    │   ├── CompanyDetailScreen
    │   └── CreateCompanyScreen
    ├── Users → UserListScreen
    ├── Reports → PlatformReportsScreen
    └── Settings → PlatformSettingsScreen
```

---

## Total Screens: ~40

| Navigator | Screen Count |
|-----------|:-----------:|
| Auth | 4 |
| User | 14 |
| Manager | 9 |
| Admin | 12 |
| Super Admin | 7 |
| Shared modals | 3 |
