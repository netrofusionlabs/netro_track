# API Reference

> **Purpose:** Complete endpoint catalog for the NetroTrack API.
> **Dependencies:** [API Design](api-design.md), [User Roles](../product/user-roles.md)

---

## Authentication

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/auth/login` | Public | Login with employee ID + password |
| POST | `/api/v1/auth/mpin` | Public | Login with MPIN |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | All | Logout and revoke tokens |
| POST | `/api/v1/auth/mpin/setup` | All | Create or update MPIN |
| POST | `/api/v1/auth/mpin/reset` | Admin, SuperAdmin | Reset user's MPIN |
| POST | `/api/v1/auth/password/reset` | Admin, SuperAdmin | Reset user's password |
| POST | `/api/v1/auth/device/register` | All | Register device |
| GET | `/api/v1/auth/me` | All | Get current user profile |

---

## Companies (Super Admin)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/companies` | SuperAdmin | List all companies |
| POST | `/api/v1/companies` | SuperAdmin | Create company |
| GET | `/api/v1/companies/:id` | SuperAdmin | Get company details |
| PUT | `/api/v1/companies/:id` | SuperAdmin | Update company |
| PATCH | `/api/v1/companies/:id/suspend` | SuperAdmin | Suspend company |
| PATCH | `/api/v1/companies/:id/activate` | SuperAdmin | Activate company |
| GET | `/api/v1/companies/:id/stats` | SuperAdmin | Company usage stats |

---

## User Management & Hierarchy

| Method | Endpoint | Minimum Role | Description |
|--------|----------|--------------|-------------|
| GET | `/api/v1/user-management` | Manager | List users in company scope (Supports `page`, `pageSize`, `search`, `tab`, `status` params; Paginated response) |
| GET | `/api/v1/user-management/managers` | CompanyAdmin | List active managers (for selection dropdowns) |
| GET | `/api/v1/user-management/unassigned` | CompanyAdmin | List unassigned employees (`managerId = null`) |
| GET | `/api/v1/user-management/:id` | Manager | Get user profile by ID |
| POST | `/api/v1/user-management` | Manager | Create user (role-aware; Manager auto-assigns to self) |
| PUT | `/api/v1/user-management/:id` | CompanyAdmin | Update user details & role |
| POST | `/api/v1/user-management/:id/deactivate` | HR / Admin | Deactivate user account (`status = INACTIVE`) |
| POST | `/api/v1/user-management/:id/activate` | HR / Admin | Reactivate user account (`status = ACTIVE`) |
| POST | `/api/v1/user-management/:id/reset-credentials` | Manager / HR / Admin | Reset target user's password to `Password123!` & clear MPIN (`actorRank > targetRank`) |
| POST | `/api/v1/user-management/:id/remove-manager` | HR / Admin | Atomic manager removal workflow with employee reassignment |
| GET | `/api/v1/user-management/:id/timeline` | All (Scoped) | Get user's professional timeline & career audit events |

---

## Employees

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/employees` | Admin, Manager | List employees (scoped) |
| POST | `/api/v1/employees` | Admin, SuperAdmin | Create employee |
| GET | `/api/v1/employees/:id` | Admin, Manager | Get employee details |
| PUT | `/api/v1/employees/:id` | Admin, SuperAdmin | Update employee |
| PATCH | `/api/v1/employees/:id/suspend` | Admin | Suspend employee |
| PATCH | `/api/v1/employees/:id/activate` | Admin | Activate employee |
| POST | `/api/v1/employees/bulk-import` | Admin | Import employees from CSV |

---

## Branches / Departments / Designations

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/branches` | Admin | List branches |
| POST | `/api/v1/branches` | Admin | Create branch |
| PUT | `/api/v1/branches/:id` | Admin | Update branch |
| DELETE | `/api/v1/branches/:id` | Admin | Soft delete branch |
| GET | `/api/v1/departments` | Admin | List departments |
| POST | `/api/v1/departments` | Admin | Create department |
| PUT | `/api/v1/departments/:id` | Admin | Update department |
| DELETE | `/api/v1/departments/:id` | Admin | Soft delete department |
| GET | `/api/v1/designations` | Admin | List designations |
| POST | `/api/v1/designations` | Admin | Create designation |
| PUT | `/api/v1/designations/:id` | Admin | Update designation |
| DELETE | `/api/v1/designations/:id` | Admin | Soft delete designation |

---

## Attendance

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/attendance/punch-in` | User | Punch in |
| POST | `/api/v1/attendance/punch-out` | User | Punch out |
| GET | `/api/v1/attendance/today` | User | Today's attendance |
| GET | `/api/v1/attendance/history` | User | Personal attendance history |
| GET | `/api/v1/attendance/team` | Manager | Team attendance for a date |
| GET | `/api/v1/attendance/company` | Admin | Company attendance summary |
| GET | `/api/v1/attendance/monthly` | User, Manager, Admin | Monthly summary |

---

## GPS Tracking

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/tracking/batch` | User | Upload GPS batch |
| GET | `/api/v1/tracking/route` | User, Manager, Admin | Get route for user+date |
| GET | `/api/v1/tracking/live` | Manager, Admin | Get latest positions for team |
| GET | `/api/v1/tracking/distance` | User, Manager | Distance for user+date |

---

## Customer Visits

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/customer-visits` | User | Create visit |
| GET | `/api/v1/customer-visits` | User, Manager, Admin | List visits (scoped) |
| GET | `/api/v1/customer-visits/:id` | User, Manager, Admin | Get visit details |
| GET | `/api/v1/customer-visits/today` | User | Today's visits |

---

## Customers

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/customers` | User, Manager, Admin | List customers |
| POST | `/api/v1/customers` | User, Admin | Create customer |
| GET | `/api/v1/customers/:id` | User, Manager, Admin | Get customer |
| PUT | `/api/v1/customers/:id` | Admin | Update customer |

---

## Product Sales

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/product-sales` | User | Create sale |
| GET | `/api/v1/product-sales` | User, Manager, Admin | List sales (scoped) |
| GET | `/api/v1/product-sales/:id` | User, Manager, Admin | Get sale details |
| GET | `/api/v1/product-sales/today` | User | Today's sales |

---

## Products

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/products` | User, Admin | List products |
| POST | `/api/v1/products` | Admin | Create product |
| PUT | `/api/v1/products/:id` | Admin | Update product |
| DELETE | `/api/v1/products/:id` | Admin | Soft delete product |

---

## Inspections

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/inspections` | User | Create inspection |
| GET | `/api/v1/inspections` | User, Manager, Admin | List inspections (scoped) |
| GET | `/api/v1/inspections/:id` | User, Manager, Admin | Get inspection details |
| GET | `/api/v1/inspections/today` | User | Today's inspections |

---

## Reports

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/reports/attendance` | Manager, Admin | Attendance report |
| GET | `/api/v1/reports/visits` | Manager, Admin | Visit report |
| GET | `/api/v1/reports/sales` | Manager, Admin | Sales report |
| GET | `/api/v1/reports/inspections` | Manager, Admin | Inspection report |
| GET | `/api/v1/reports/productivity` | Manager, Admin | Productivity metrics |
| GET | `/api/v1/reports/distance` | Manager, Admin | Distance traveled report |
| GET | `/api/v1/reports/platform` | SuperAdmin | Platform analytics |

---

## Notifications

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/notifications` | All | List user's notifications |
| PATCH | `/api/v1/notifications/:id/read` | All | Mark as read |
| PATCH | `/api/v1/notifications/read-all` | All | Mark all as read |
| GET | `/api/v1/notifications/unread-count` | All | Unread count |

---

## Uploads

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/uploads/sign` | User, Admin | Generate signed upload URL |

---

## Dashboard

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/dashboard/user` | User | User dashboard data |
| GET | `/api/v1/dashboard/manager` | Manager | Manager dashboard data |
| GET | `/api/v1/dashboard/admin` | Admin | Admin dashboard data |
| GET | `/api/v1/dashboard/platform` | SuperAdmin | Platform dashboard |

---

## Settings

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/settings/company` | Admin | Get company settings |
| PUT | `/api/v1/settings/company` | Admin | Update company settings |

---

## Health

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/health` | Public | Basic health check |
| GET | `/health/db` | Public | Database connectivity |
| GET | `/health/redis` | Public | Redis connectivity |
| GET | `/health/storage` | Public | R2 connectivity |

---

**Total: ~85 endpoints**
