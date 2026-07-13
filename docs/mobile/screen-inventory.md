# Screen Inventory

> **Purpose:** Complete catalog of all screens with their purpose and key elements.
> **Dependencies:** [Navigation Hierarchy](navigation-hierarchy.md)

---

## Auth Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| LoginScreen | First-time login | Employee ID input, password input, submit button |
| MpinScreen | Daily quick login | 4-6 digit keypad, biometric button, forgot MPIN |
| MpinSetupScreen | Create/change MPIN | Keypad, confirm step |
| BiometricSetupScreen | Enable biometric login | Biometric prompt, skip option |

## User Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| UserDashboard | Daily overview | Attendance status, punch button, today's stats, quick actions |
| AttendanceHistoryScreen | Past attendance | Monthly calendar, daily attendance list |
| MapScreen | Personal route map | Map with today's route polyline, distance |
| RoutePlaybackScreen | Animated route replay | Map, timeline slider, play/pause |
| NewVisitScreen | Create customer visit | Customer picker, GPS auto-capture, camera, notes form |
| NewSaleScreen | Record product sale | Customer picker, product picker, quantity, price |
| NewInspectionScreen | Record inspection | Site name, category, observation, photos, GPS |
| HistoryScreen | Activity timeline | Tabbed: Visits, Sales, Inspections with date filter |
| VisitDetailScreen | View visit details | Map pin, photos, customer info, notes |
| SaleDetailScreen | View sale details | Products, quantities, total, customer |
| InspectionDetailScreen | View inspection details | Photos, observation, recommendation, map |
| ProfileScreen | User profile | Avatar, name, role, company, settings |
| NotificationsScreen | Notification center | Notification list, read/unread |

## Manager Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| ManagerDashboard | Team overview | Present/absent count, live count, today's stats |
| TeamListScreen | Assigned employees | Employee cards with status, last seen, battery |
| EmployeeDetailScreen | Individual employee view | Today's route, visits, sales, attendance |
| EmployeeRouteScreen | Employee route map | Route polyline with visit pins |
| TeamMapScreen | Live team map | All employee markers, color-coded by status |
| ReportsScreen | Report selection | Report type cards with date range picker |
| ReportDetailScreen | Generated report | Table/chart data, export button |

## Admin Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| AdminDashboard | Company overview | Employee count, attendance summary, activity |
| EmployeeListScreen | All company employees | Search, filter, employee cards |
| CreateEmployeeScreen | Onboard employee | Multi-step form: personal, branch, department, manager |
| EditEmployeeScreen | Update employee | Pre-filled form, suspend/activate |
| CompanyScreen | Company profile | Logo, name, contact info |
| BranchesScreen | Branch management | Branch list, create/edit |
| DepartmentsScreen | Department management | Department list, create/edit |
| DesignationsScreen | Designation management | Designation list, create/edit |
| CompanySettingsScreen | Company config | Working hours, selfie requirements, GPS interval |

## Super Admin Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| SuperAdminDashboard | Platform overview | Total companies, employees, active users |
| CompanyListScreen | All companies | Company cards, status filter |
| CompanyDetailScreen | Company detail | Stats, employees, subscription, suspend/activate |
| CreateCompanyScreen | Onboard company | Company details, create admin |
| UserListScreen | Platform users | Cross-company user search |
| PlatformReportsScreen | Platform analytics | Usage metrics, growth charts |
| PlatformSettingsScreen | Global settings | App version requirements, global config |
