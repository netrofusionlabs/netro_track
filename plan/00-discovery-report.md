# NetroTrack — Authorization System Discovery Report

> **Phase 1 Output** — Complete analysis of the existing system before any implementation decisions.

---

## 1. Project Architecture Summary

| Layer | Technology | Key Location |
|-------|-----------|--------------|
| **Backend** | Express.js + TypeScript | `apps/backend/src/` |
| **Database** | PostgreSQL via Prisma ORM | `apps/backend/prisma/schema.prisma` |
| **Web App** | Angular (standalone components) | `apps/web/src/app/` |
| **Mobile App** | React Native CLI + Zustand | `apps/mobile/src/` |
| **Shared** | TypeScript package | `packages/shared/src/` |

### Monorepo Structure
```
netrotrack/
├── apps/
│   ├── backend/       # Express.js API (19 modules)
│   ├── web/           # Angular SPA
│   └── mobile/        # React Native CLI
├── packages/
│   └── shared/        # Zod schemas, role constants, validators
└── docs/
```

---

## 2. Existing Authentication Architecture

### JWT-Based Authentication
- **Access Token**: 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- **Refresh Token**: 7-day expiry, stored in `sessions` table, single-use with rotation
- **JWT Payload**: `{ id, companyId, employeeId, role }`
- **Password Hashing**: Argon2

### Authentication Flow
1. User logs in via `POST /api/v1/auth/login` (password) or `POST /api/v1/auth/mpin` (MPIN)
2. Backend verifies credentials, generates JWT pair
3. JWT payload includes the user's **hardcoded `Role` enum** value
4. `authMiddleware` verifies token on every request, extracts `req.user`
5. `req.companyId` is derived from JWT (or `x-company-id` header for SUPER_ADMIN/MASTER_SUPER_ADMIN)

### Files
- `apps/backend/src/shared/middlewares/auth.middleware.ts`
- `apps/backend/src/modules/auth/auth.service.ts`
- `apps/backend/src/shared/middlewares/tenant.middleware.ts`

---

## 3. Existing Authorization Architecture

### 3.1 Role Enum (Hardcoded in Prisma Schema)

```prisma
enum Role {
  MASTER_SUPER_ADMIN
  SUPER_ADMIN
  COMPANY_ADMIN
  HR
  MANAGER
  EMPLOYEE
}
```

This is the **entire authorization model**. The User model has a single `role Role` field.

### 3.2 Backend Authorization Mechanism

Two middleware functions in `role.middleware.ts`:

1. **`requireRoles(...allowedRoles: Role[])`** — Checks if user's role is in the allowed list. `MASTER_SUPER_ADMIN` always passes.
2. **`requireHierarchy(minimumRole: Role)`** — Uses numeric rank to check if user's role meets minimum.

### 3.3 Authorization Service

`authorization.service.ts` contains:

| Method | Purpose |
|--------|---------|
| `canCreateRole()` | Which roles an actor can create |
| `isMasterSuperAdmin()` | Simple role check |
| `assertNotMasterTarget()` | Prevents modifications to MSA |
| `assertCompanyScope()` | Cross-tenant access prevention |
| `enforceManagerCreationScope()` | Manager can only create under self |
| `canRemoveUser()` | Role-hierarchy-based deletion check |
| `canManageUser()` | Role-hierarchy-based management check |

### 3.4 Role Rank

Defined in **three separate locations** (duplication):

| Location | Values |
|----------|--------|
| Backend `authorization.service.ts` | EMPLOYEE=0, MANAGER=1, HR=2, COMPANY_ADMIN=3, SUPER_ADMIN=4, MASTER_SUPER_ADMIN=5 |
| Web `roles.ts` | EMPLOYEE=10, MANAGER=20, HR=30, COMPANY_ADMIN=40, SUPER_ADMIN=50, MASTER_SUPER_ADMIN=60 |
| Shared `roles.ts` | EMPLOYEE=0, MANAGER=1, HR=2, COMPANY_ADMIN=3, SUPER_ADMIN=4, MASTER_SUPER_ADMIN=5 |

### 3.5 Backend Route-Level Authorization

Every route file uses `requireRoles(Role.X, Role.Y, ...)` as middleware. Examples:

```typescript
// company.routes.ts
router.get('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.getCompanies);
router.post('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), validate(...), controller.createCompany);

// user-management.routes.ts
router.get('/', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), ...);
router.post('/', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), ...);
```

**Every endpoint has hardcoded role lists.** There are ~40+ route definitions with hardcoded roles.

---

## 4. Existing Tenant Architecture

### 4.1 Company Model
- `companies` table with UUID primary key
- Fields: `name`, `code` (unique), `status` (ACTIVE/INACTIVE/SUSPENDED), soft delete via `deleted_at`
- Every business table has `company_id` FK (consistent multi-tenancy)

### 4.2 Tenant Module Entitlement (Partial)

**Already exists:** `CompanyModule` model

```prisma
enum ModuleType {
  ATTENDANCE, LEAVE, SHIFT, GPS, PAYROLL,
  EXPENSE, ASSET, PERFORMANCE, RECRUITMENT, REGULARIZATION
}

model CompanyModule {
  id            String     @id @default(uuid())
  companyId     String     @map("company_id")
  module        ModuleType
  isEnabled     Boolean    @default(false)
  configuration Json?
  company       Company    @relation(...)
  @@unique([companyId, module])
}
```

**Problem**: This is a **hardcoded enum**, not a dynamic data table. Adding a new module type requires a schema change and migration. It also only covers high-level modules, not submodules/features or fine-grained permissions.

### 4.3 How Tenant Modules Are Used

In `auth.service.ts`, the login response includes `isGpsEnabled` and `isRegularizationEnabled` — both derived from `CompanyModule` records. The mobile app uses these flags to toggle GPS tracking behavior.

**No other tenant module checks exist in API authorization.** The module entitlement system is only used for feature flags, not for authorization.

---

## 5. Existing User Model

### User Table Fields
- `id` (UUID PK)
- `companyId` (FK to companies — **single tenant membership**)
- `employeeId` (unique within company)
- `role` (enum: 6 fixed values)
- `status` (ACTIVE/INACTIVE)
- `managerId` (self-referencing FK for hierarchy)
- `branchId`, `departmentId`, `designationId`
- `deletedAt` (soft delete)

### Key Observations
1. **Users belong to exactly ONE company** — no multi-tenant user support
2. **Single role per user** — no concept of multiple roles or role combinations
3. **No permissions table** — authorization is entirely role-based
4. **No groups/access profiles** — users are assigned a single role directly

---

## 6. Web Application Authorization

### 6.1 Framework
- **Angular** with standalone components
- **Routing**: Angular Router with `canActivate` guards
- **State**: BehaviorSubject + Angular signals in `ApiService`

### 6.2 Route Guard (`auth.guard.ts`)
- Checks `ApiService.isAuthenticated()` first
- Then checks `route.data['roles']` against `hasRole(user.role, required)`
- `hasRole()` gives `MASTER_SUPER_ADMIN` automatic access to everything

### 6.3 Navigation (`navigation.service.ts`)
- **Hardcoded `IA` array** defines 10 navigation groups with ~15 items
- Each `NavItem` has a `roles: readonly Role[]` array
- Navigation is filtered by `hasRole(role, item.roles)`
- No database-driven menu configuration

### 6.4 Feature-Level Authorization (`roles.ts`)
```typescript
export const CAN = {
  administerPlatform: ['SUPER_ADMIN'] as const,
  manageWorkforce: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'] as const,
  editWorkforce: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
  managePolicies: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'] as const,
  // ... 7 more capability definitions
};
```

Used throughout feature components to show/hide buttons, controls, and data.

### 6.5 Places Where Roles Are Checked in Web

| File | What's Checked |
|------|---------------|
| `auth.guard.ts` | Route access |
| `navigation.service.ts` | Sidebar visibility |
| `command-center.component.ts` | Dashboard cards |
| `people.component.ts` | Edit/create buttons |
| `attendance.component.ts` | Team/company view tabs |
| `customers.component.ts` | Delete/create buttons |
| `products.component.ts` | Modify capabilities |
| `settings.component.ts` | Company settings visibility |
| `organization.component.ts` | Restructure permissions |
| `pulse.service.ts` | Dashboard scope |

---

## 7. Mobile Application Authorization

### 7.1 Framework
- React Native CLI with TypeScript
- Navigation: React Navigation (bottom tabs + stack navigators)
- State: Zustand (persisted auth store)

### 7.2 Role-Based Navigation (`RoleNavigator.tsx`)
**Entirely hardcoded.** Four separate Tab.Navigator components:

| Role | Navigator | Visible Tabs |
|------|-----------|-------------|
| EMPLOYEE | `FieldEmployeeTabs` | Dashboard, Org Chart, Attendance, Visits |
| MANAGER / HR | `ManagerTabs` | People, Attendance, Approvals |
| COMPANY_ADMIN | `TenantAdminTabs` | People, Attendance, Configs, Approvals |
| SUPER_ADMIN / MSA | `SuperAdminTabs` | Companies, People, Configs, Approvals, More |

**No dynamic navigation.** Adding a new feature requires changing React components.

### 7.3 Config Screens
- `ConfigurationsScreen.tsx` — Hardcoded role arrays per menu item
- `MoreScreen.tsx` — Hardcoded role arrays per menu item

### 7.4 Auth Store
- Stores `user.role` as a string
- No permissions, no groups, no effective access payload
- Role checks are done by string comparison in UI components

---

## 8. Existing Audit System

`AuditLog` model exists:

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  companyId  String?  @map("company_id")
  userId     String   @map("user_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String?  @map("entity_id")
  oldValues  Json?
  newValues  Json?
  metadata   Json?
  createdAt  DateTime @default(now())
}
```

`AuditService` handles logging. Currently used for user lifecycle events.

**Reusable** — the existing audit system can be extended for authorization changes.

---

## 9. Existing Error Handling

- `AppError` class with `code`, `message`, `statusCode`, `details`
- `errorMiddleware` returns standardized API response
- Pino logger for internal errors

---

## 10. Gap Analysis

### What Exists vs What's Needed

| Capability | Current State | Required State |
|-----------|---------------|----------------|
| **Roles** | 6 hardcoded enum values | Dynamic, database-driven access groups |
| **Permissions** | None (role = implicit permission set) | Fine-grained, per-operation permissions |
| **Tenant Entitlement** | `CompanyModule` enum (10 types) | Dynamic capability tree with sub-features |
| **User Authorization** | Single `role` field | Group + direct permission assignment |
| **Direct User Permissions** | Not supported | User-specific overrides within tenant entitlement |
| **Navigation (Web)** | Hardcoded `IA` array with role arrays | Database-driven, permission-aware |
| **Navigation (Mobile)** | 4 hardcoded Tab navigators | Dynamic tabs based on effective permissions |
| **Route Protection (Web)** | `data: { roles: CAN.xxx }` | Permission-based guard |
| **API Authorization** | `requireRoles(Role.X, ...)` | Dynamic permission middleware |
| **Permission Resolution** | `role ∈ allowedRoles` | Tenant entitlement ∩ (Group ∪ Direct) |
| **Admin UI** | None for authorization management | Full group/user permission management |
| **Effective Access Preview** | Not supported | Admin can see exactly what any user can do |
| **Cache/Invalidation** | Redis exists (for org chart, sessions) | Permission caching with invalidation |
| **Audit** | Exists for user lifecycle | Extend to authorization changes |

### Critical Hardcoded Authorization Points

| Category | Count | Locations |
|----------|-------|-----------|
| Backend `requireRoles()` calls | ~40+ | All 15+ route files |
| Web `CAN.*` capability checks | ~30+ | 10+ feature components |
| Web navigation role arrays | ~15 | `navigation.service.ts` |
| Web route `data.roles` | ~6 | `app.routes.ts` |
| Mobile role-specific navigators | 4 | `RoleNavigator.tsx` |
| Mobile role array filters | ~10 | `ConfigurationsScreen.tsx`, `MoreScreen.tsx` |
| Backend `AuthorizationService` | ~6 methods | `authorization.service.ts` |
| Shared role constants | 3 files | `packages/shared`, web `roles.ts`, backend `authorization.service.ts` |

---

## 11. Answers to Discovery Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | How are modules represented? | `ModuleType` Prisma enum (10 values) + `CompanyModule` table |
| 2 | How are submodules represented? | **Not represented** — no submodule concept exists |
| 3 | Deeper nesting support? | **No** — flat module-level only |
| 4 | How are tenants represented? | `companies` table with UUID, code, status, soft delete |
| 5 | How do users belong to tenants? | Single `companyId` FK on `users` table |
| 6 | Multi-tenant users? | **No** — one user, one company |
| 7 | How are menus generated? | **Hardcoded** in both web (`IA` array) and mobile (separate Tab.Navigators) |
| 8 | How do APIs map to capabilities? | **No mapping** — routes use direct `requireRoles()` |
| 9 | How do mobile screens map? | **Hardcoded** role-to-navigator mapping |
| 10 | Existing permission mechanism? | **Role enum only** — no permissions table, no groups |

---

## 12. Platform Administration

### MASTER_SUPER_ADMIN
- Bypasses all role checks (hardcoded in `requireRoles`)
- Can see all companies
- Can override `companyId` via `x-company-id` header
- Can create SUPER_ADMIN users
- **Belongs to the platform company** (NETRO)

### SUPER_ADMIN
- Can manage companies, create COMPANY_ADMIN users
- Can set `x-company-id` to manage any tenant
- Essentially a platform-level administrator

### COMPANY_ADMIN
- Tenant-level administrator
- Can manage HR, MANAGER, EMPLOYEE within their company
- Can configure policies, branches, departments

---

## 13. Existing Database Conventions

| Convention | Pattern |
|-----------|---------|
| Primary Key | UUID (`@id @default(uuid()) @db.Uuid`) |
| Timestamps | `created_at`, `updated_at` (snake_case mapped) |
| Soft Delete | `deleted_at DateTime?` |
| Table Names | snake_case plural (`@@map("table_name")`) |
| Column Names | snake_case mapped (`@map("column_name")`) |
| Indexes | On `companyId`, foreign keys, query columns |
| Unique Constraints | Compound uniques for business rules |
| Relations | Explicit FK with `onDelete` policies |

---

## 14. Technology Inventory for Authorization

### Available Infrastructure
- **Redis** — Already configured for org chart caching
- **Socket.IO** — Already configured for real-time features
- **Audit Logging** — `AuditLog` table + `AuditService`
- **Validation** — Zod schemas via shared package
- **Error Handling** — `AppError` + global error middleware

### Not Available (Must Create)
- Permission/capability tables
- Access group tables
- Tenant entitlement management
- Permission resolution engine
- Effective access API
- Authorization admin UI (web + mobile)
- Permission caching layer
- Authorization middleware replacement
