# NetroTrack — Dynamic Authorization System: Architecture Proposal (Revised)

> **Phase 2 Output — Enterprise Dynamic Access Control & Authorization Architecture**
> Revised with strict Tenant Entitlement Boundary enforcement, deterministic resolution, capability tree design, and zero hardcoded permission registries.

---

## 1. Executive Summary & Core Architectural Invariant

The NetroTrack Dynamic Access Control System replaces hardcoded role-based checks with a **dynamic, database-driven, multi-tenant authorization framework**.

### The Absolute Access Ceiling Invariant

$$\text{Effective User Access} \subseteq \text{Tenant Entitled Access}$$

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM CAPABILITIES                           │
│  (system_capabilities: Modules, Features/Submodules, Actions)          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Entitles subset
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         TENANT ENTITLEMENT                             │
│                  (company_entitlements: The CEILING)                   │
│         No tenant admin or user can ever exceed this boundary!        │
└──────────────────┬───────────────────────────────────┬─────────────────┘
                   │                                   │
                   │ Configures within Ceiling         │ Overrides within Ceiling
                   ▼                                   ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│            ACCESS GROUPS             │   │   DIRECT USER PERMISSIONS   │
│ (access_groups & group_permissions)  │   │  (user_direct_permissions)  │
│  Enforced: perms ⊆ Entitlements      │   │  Enforced: perms ⊆ Entitle  │
└──────────────────┬───────────────────┘   └─────────────┬───────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │ Combined (Union)
                                      ▼
                   ┌─────────────────────────────────────┐
                   │        USER ASSIGNED ACCESS         │
                   │  (Group Permissions ∪ Direct Perms) │
                   └──────────────────┬──────────────────┘
                                      │
                                      │ Intersect with Tenant Ceiling
                                      ▼
                   ┌─────────────────────────────────────┐
                   │       EFFECTIVE USER ACCESS         │
                   │  (User Assigned ∩ Tenant Entitled)  │
                   └─────────────────────────────────────┘
```

### Non-Negotiable Security Rules

1. **Absolute Ceiling**: A tenant administrator cannot assign any capability to an access group, a user, or themselves if the tenant is not entitled to that capability.
2. **Server-Side Enforcement**: API endpoints for Access Group creation/update and Direct User Permission assignment validate on the backend that `requestedPermissions ⊆ tenantEntitledPermissions`. Any violation fails with `403 Forbidden` (`PERMISSION_NOT_ENTITLED`).
3. **Immediate Cascading Revocation**: If a capability is revoked from a tenant in `company_entitlements`, effective access is **instantly lost** across all users in that tenant, even if their access groups or direct permission records still contain the capability ID.
4. **Independent Direct Permissions & Groups**: Direct permissions never modify groups; group changes never create lingering direct user records.
5. **Database is Source of Truth**: No secondary hardcoded permission enums or static capability registries in code. Capability identifiers are resolved dynamically from database strings/keys.

---

## 2. Capability Hierarchy: Tree Model vs Fixed 3-Level

### Evaluation: Hierarchical Capability Tree (`system_capabilities`)

To avoid arbitrary depth limits while providing intuitive organization, capabilities are modeled as a **hierarchical tree with capability types**:

```
CapabilityType: MODULE | FEATURE | ACTION
```

```
[MODULE] attendance ("Attendance Management", key: "attendance")
  ├── [FEATURE] punch ("Punch In/Out", key: "punch")
  │     ├── [ACTION] view ("View Punch Status", key: "view")
  │     └── [ACTION] create ("Punch In / Punch Out", key: "create")
  ├── [FEATURE] history ("Attendance History", key: "history")
  │     ├── [ACTION] view ("View History", key: "view")
  │     └── [ACTION] export ("Export Attendance Records", key: "export")
  └── [FEATURE] regularization ("Regularization", key: "regularization")
        ├── [ACTION] view ("View Requests", key: "view")
        ├── [ACTION] create ("Submit Regularization", key: "create")
        ├── [ACTION] approve ("Approve Regularization", key: "approve")
        └── [ACTION] reject ("Reject Regularization", key: "reject")
```

### Why a Tree with Self-Relation?
- **Flexible Depth**: Naturally supports standard 3 levels (`Module → Feature → Action`), but can easily accommodate 4th-level granular sub-actions (e.g., `Field Operations → Visits → Orders → Apply Discount`) without modifying the database schema.
- **Hierarchical Path / Slugs**: Each node has a `slug` composed of its path: `attendance.regularization.approve`. Lookups are fast, readable, and fully dynamic.
- **Bulk Entitlement Propagation**: Entitling a parent `MODULE` or `FEATURE` can automatically entitle all child `ACTION`s, while still allowing granular sub-feature toggling.

---

## 3. Database Schema (Prisma)

```prisma
// ============================================================================
// DYNAMIC AUTHORIZATION SYSTEM MODELS
// ============================================================================

enum CapabilityType {
  MODULE
  FEATURE
  ACTION
}

/// Platform capability registry (Modules, Features, Actions in a tree)
model SystemCapability {
  id          String         @id @default(uuid()) @db.Uuid
  parentId    String?        @map("parent_id") @db.Uuid
  type        CapabilityType
  key         String         // e.g. "attendance", "regularization", "approve"
  slug        String         @unique // e.g. "attendance", "attendance.regularization", "attendance.regularization.approve"
  name        String         // Display label
  description String?
  icon        String?        // UI icon name
  sortOrder   Int            @default(0) @map("sort_order")
  isActive    Boolean        @default(true) @map("is_active")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  // Hierarchy relations
  parent   SystemCapability?  @relation("CapabilityHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children SystemCapability[] @relation("CapabilityHierarchy")

  // Entitlements & Permissions relations
  tenantEntitlements   CompanyEntitlement[]
  groupPermissions     AccessGroupPermission[]
  userDirectPermissions UserDirectPermission[]

  @@index([parentId])
  @@index([type])
  @@index([slug])
  @@index([isActive])
  @@map("system_capabilities")
}

/// Tenant Entitlement boundary (The Ceiling)
model CompanyEntitlement {
  id           String           @id @default(uuid()) @db.Uuid
  companyId    String           @map("company_id") @db.Uuid
  capabilityId String           @map("capability_id") @db.Uuid
  isEnabled    Boolean          @default(true) @map("is_enabled")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  company    Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  capability SystemCapability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)

  @@unique([companyId, capabilityId])
  @@index([companyId, isEnabled])
  @@map("company_entitlements")
}

/// Tenant Access Groups (e.g., "Field Supervisor", "HR Executive")
model AccessGroup {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @map("company_id") @db.Uuid
  name        String
  description String?
  isSystem    Boolean  @default(false) @map("is_system") // Seeded system groups
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  company     Company                 @relation(fields: [companyId], references: [id], onDelete: Cascade)
  permissions AccessGroupPermission[]
  userMembers UserAccessGroup[]

  @@unique([companyId, name])
  @@index([companyId, isActive])
  @@map("access_groups")
}

/// Permissions assigned to an Access Group (Must be ⊆ CompanyEntitlement)
model AccessGroupPermission {
  id            String   @id @default(uuid()) @db.Uuid
  accessGroupId String   @map("access_group_id") @db.Uuid
  capabilityId  String   @map("capability_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  accessGroup AccessGroup      @relation(fields: [accessGroupId], references: [id], onDelete: Cascade)
  capability  SystemCapability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)

  @@unique([accessGroupId, capabilityId])
  @@index([accessGroupId])
  @@index([capabilityId])
  @@map("access_group_permissions")
}

/// User membership in Access Groups
model UserAccessGroup {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  accessGroupId String   @map("access_group_id") @db.Uuid
  assignedById  String?  @map("assigned_by_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessGroup AccessGroup @relation(fields: [accessGroupId], references: [id], onDelete: Cascade)
  assignedBy  User?       @relation("AssignedByUserAccessGroups", fields: [assignedById], references: [id], onDelete: SetNull)

  @@unique([userId, accessGroupId])
  @@index([userId])
  @@index([accessGroupId])
  @@map("user_access_groups")
}

/// Direct User Permission Overrides (Must be ⊆ CompanyEntitlement)
model UserDirectPermission {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  companyId    String   @map("company_id") @db.Uuid
  capabilityId String   @map("capability_id") @db.Uuid
  assignedById String?  @map("assigned_by_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at")

  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  company    Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  capability SystemCapability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)
  assignedBy User?            @relation("AssignedByUserDirectPerms", fields: [assignedById], references: [id], onDelete: SetNull)

  @@unique([userId, capabilityId])
  @@index([userId, companyId])
  @@index([capabilityId])
  @@map("user_direct_permissions")
}
```

---

## 4. Deterministic Permission Resolution Engine

### 4.1 Formal Resolution Pipeline

Given an authenticated user $u$ belonging to company $C$:

1. **Tenant Entitlement Set ($E_C$)**:
   $$E_C = \{ c.\text{id} \mid c \in \text{SystemCapability} \land \text{CompanyEntitlement}(C, c.\text{id}, \text{isEnabled}=\text{true}) \land c.\text{isActive}=\text{true} \}$$
   *(If a parent capability is entitled, all active descendant action capabilities inherit entitlement unless explicitly disabled).*

2. **Group Permissions Set ($G_u$)**:
   $$G_u = \bigcup_{g \in \text{ActiveGroups}(u, C)} \{ p.\text{capabilityId} \mid p \in \text{AccessGroupPermission}(g) \}$$
   where $\text{ActiveGroups}(u, C) = \{ g \in \text{AccessGroup} \mid \text{UserAccessGroup}(u, g) \land g.\text{companyId} = C \land g.\text{isActive} = \text{true} \land g.\text{deletedAt} = \text{null} \}$.

3. **Direct Permissions Set ($D_u$)**:
   $$D_u = \{ d.\text{capabilityId} \mid d \in \text{UserDirectPermission}(u, C) \}$$

4. **User Assigned Capabilities ($U_u$)**:
   $$U_u = G_u \cup D_u$$

5. **Effective Capabilities ($\text{Eff}_u$)**:
   $$\text{Eff}_u = U_u \cap E_C$$

### 4.2 Handling Disabled/Archived Entities

| Entity State | Resolution Impact |
|--------------|-------------------|
| `system_capabilities.is_active = false` | Dropped from $E_C$, $G_u$, $D_u$, and $\text{Eff}_u$ |
| `company_entitlements.is_enabled = false` | Dropped from $E_C \implies$ instantly excluded from $\text{Eff}_u$ |
| `access_groups.is_active = false` or `deleted_at != null` | Group dropped from $\text{ActiveGroups}(u, C) \implies$ permissions excluded |
| User is `INACTIVE` / deleted | No access granted; token validation fails at auth middleware |

### 4.3 Provenance & Debug Traceability

The authorization service computes both the effective permission set and an **audit provenance trail** for administrative inspection:

```typescript
export interface EffectiveAccessProfile {
  userId: string;
  companyId: string;
  entitledCapabilitySlugs: string[];
  effectiveSlugs: string[];
  provenance: Record<string, {
    grantedVia: Array<{ type: 'GROUP'; groupId: string; groupName: string } | { type: 'DIRECT'; assignedAt: string }>;
    entitled: boolean;
    effective: boolean;
  }>;
  resolvedAt: string;
}
```

---

## 5. Server-Side Ceiling & Tenant Isolation Enforcement

### 5.1 Enforcing Ceiling on Access Group Configuration

When a Tenant Admin creates or updates an Access Group (`POST/PUT /api/v1/authorization/access-groups`):

```typescript
// Authorization Service: validateGroupPermissionsWithinCeiling
public async validatePermissionsWithinTenantCeiling(
  companyId: string,
  capabilityIds: string[]
): Promise<void> {
  // Fetch entitled capability IDs for this company
  const entitledIds = await this.getEntitledCapabilityIds(companyId);
  const entitledSet = new Set(entitledIds);

  const nonEntitled = capabilityIds.filter(id => !entitledSet.has(id));
  if (nonEntitled.length > 0) {
    throw new AppError(
      'PERMISSION_NOT_ENTITLED',
      `Cannot assign capabilities [${nonEntitled.join(', ')}] because they are not entitled to this tenant.`,
      403,
      { nonEntitledCapabilityIds: nonEntitled }
    );
  }
}
```

### 5.2 Enforcing Ceiling on Direct User Permissions

When assigning direct permissions (`PUT /api/v1/authorization/users/:userId/direct-permissions`):

```typescript
// 1. Verify target user belongs to actor's company (IDOR prevention)
const targetUser = await this.userRepository.findById(targetUserId);
if (!targetUser || targetUser.companyId !== actorCompanyId) {
  throw new AppError('USER_NOT_FOUND', 'Target user does not exist within your organization', 404);
}

// 2. Validate all direct capability IDs are within tenant ceiling
await this.validatePermissionsWithinTenantCeiling(actorCompanyId, requestedCapabilityIds);
```

### 5.3 Multi-Tenant Isolation Guarantees

1. **Company Context**: `req.companyId` is derived exclusively from the verified JWT (or verified `x-company-id` header for platform super admins). Client-supplied company IDs in bodies/query parameters are strictly ignored for authorization.
2. **Scoping on All Queries**: Every read/write for `access_groups`, `access_group_permissions`, `user_access_groups`, and `user_direct_permissions` has a mandatory `WHERE company_id = req.companyId`.

---

## 6. System Roles vs Dynamic Authorization

### Clear Boundary Separation

| Concern | System Role (`User.role`) | Dynamic Authorization (`SystemCapability`) |
|---------|---------------------------|--------------------------------------------|
| **Purpose** | Identity tier, reporting rank, platform bypass | Granular functional & business access |
| **Values** | `MASTER_SUPER_ADMIN`, `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` | Dynamic capability slugs (`attendance.punch.create`, `policies.manage`) |
| **Scope** | Platform & hierarchy rules (e.g. who can create whom) | API endpoints, UI features, navigation items |
| **Customizable?** | No (Fixed enum) | Yes (Tenants create custom Access Groups) |
| **Platform Bypass** | `MASTER_SUPER_ADMIN` bypasses all checks | Regular tenant users strictly evaluate effective access |

- **`MASTER_SUPER_ADMIN`**: Full platform bypass across all endpoints and tenants.
- **`SUPER_ADMIN`**: Platform administration (managing companies, managing global `system_capabilities`, managing tenant `company_entitlements`).
- **All Tenant Users (`COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`)**: Evaluated via **Effective Permissions** ($\text{Eff}_u$). Their system `role` only dictates organizational hierarchy / reporting rules, not API access.

---

## 7. Backend Enforcement: `requirePermission` Middleware

### 7.1 Middleware Implementation

```typescript
// apps/backend/src/shared/middlewares/permission.middleware.ts
export function requirePermission(...requiredSlugs: string[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !req.companyId) {
      return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
    }

    // MASTER_SUPER_ADMIN bypass preserved for platform safety
    if (req.user.role === 'MASTER_SUPER_ADMIN') {
      return next();
    }

    const permissionService = PermissionService.getInstance();
    const hasAccess = await permissionService.hasPermissions(
      req.user.id,
      req.companyId,
      requiredSlugs
    );

    if (!hasAccess) {
      return next(new AppError('FORBIDDEN', 'You do not have permission to perform this action', 403, {
        requiredPermissions: requiredSlugs
      }));
    }

    next();
  };
}
```

### 7.2 Redis Caching & Invalidation Architecture

- **Cache Key**: `perms:effective:{companyId}:{userId}` (JSON set of allowed slugs, TTL: 300s / 5m).
- **Entitlement Cache**: `entitlements:{companyId}` (JSON set of entitled slugs, TTL: 600s / 10m).
- **Invalidation Triggers**:
  - Tenant Entitlement changed $\implies$ invalidate `entitlements:{companyId}` and all `perms:effective:{companyId}:*`.
  - Access Group permissions changed $\implies$ invalidate `perms:effective:{companyId}:*` for all members of that group.
  - Direct User permissions changed $\implies$ invalidate `perms:effective:{companyId}:{userId}`.
  - User Group membership changed $\implies$ invalidate `perms:effective:{companyId}:{userId}`.

---

## 8. API Specifications for Authorization Management

### 8.1 Platform Administrator Endpoints (Tenant Entitlement Management)

- `GET /api/v1/authorization/capabilities` — Full platform capability tree
- `GET /api/v1/authorization/companies/:companyId/entitlements` — Get company's entitled capabilities
- `PUT /api/v1/authorization/companies/:companyId/entitlements` — Update company's entitled capabilities (Enforces immediate cache invalidation for the entire tenant)

### 8.2 Tenant Administrator Endpoints (Access Groups & User Management)

- `GET /api/v1/authorization/available-capabilities` — Returns only capabilities **entitled to this tenant** (for populating the Access Group permission picker UI)
- `GET /api/v1/authorization/access-groups` — List tenant access groups with member counts
- `POST /api/v1/authorization/access-groups` — Create access group (Enforces `perms ⊆ TenantEntitlements`)
- `GET /api/v1/authorization/access-groups/:id` — Get access group details & assigned capabilities
- `PUT /api/v1/authorization/access-groups/:id` — Update access group (Enforces `perms ⊆ TenantEntitlements`)
- `DELETE /api/v1/authorization/access-groups/:id` — Soft-delete access group (Disallowed if `isSystem=true`)
- `GET /api/v1/authorization/users/:userId/access-profile` — **Debug & Effective Access Inspector** (Returns effective permissions, assigned groups, direct permissions, and full entitlement provenance)
- `PUT /api/v1/authorization/users/:userId/access-groups` — Assign user to access groups
- `PUT /api/v1/authorization/users/:userId/direct-permissions` — Assign direct permissions (Enforces `perms ⊆ TenantEntitlements`)

### 8.3 Current User Endpoint

- `GET /api/v1/auth/me` & `GET /api/v1/auth/permissions` — Returns current user's effective capability slugs & navigation structure.

---

## 9. Web & Mobile Client Integration

### 9.1 Web (Angular)
- **`PermissionService`**: Holds reactive `effectivePermissions = signal<Set<string>>(new Set())`.
- **`authGuard`**: Checks `route.data['permission']` against `PermissionService.has(slug)`.
- **`NavigationService`**: Filters navigation tree dynamically based on `PermissionService.hasModule(moduleSlug)` and action permissions.
- **UI Directives / Pipes**: `*hasPermission="'attendance.punch.create'"` for button/action visibility.
- **Admin Management UI**:
  - Access Groups list & builder with capability checkboxes (only displaying tenant-entitled items).
  - User Effective Access Inspector modal in Workforce/People directory with live provenance breakdown.

### 9.2 Mobile (React Native)
- **`usePermissionStore` (Zustand)**: Persists `effectivePermissions: string[]`.
- **`usePermission(slug: string)` Hook**: Clean hook for screen/action gating.
- **Dynamic RoleNavigator**: Constructs Bottom Tabs and Drawer items based on effective modules.

---

## 10. Backward-Compatible Migration Strategy

### Step 1: Capability & Entitlement Seeding
Seed `system_capabilities` with all existing modules, features, and actions. For all existing companies, create `CompanyEntitlement` records matching their active modules.

### Step 2: System Access Group Seeding
Create default system `AccessGroup` records per tenant matching existing roles:
- `Employee (Default)`: punch, view own history, org chart.
- `Manager (Default)`: Employee + team attendance, regularization review, tracking live.
- `HR Executive (Default)`: Manager + user management, policies, organization setup.
- `Company Administrator (Default)`: All capabilities entitled to the company.

### Step 3: User Assignment
Assign every user to their corresponding default system group based on their current `User.role`.

### Step 4: Parity Verification Script
Run an automated verification script that iterates over all existing users, calculates their new effective permissions, and verifies 100% parity with legacy role checks.

### Step 5: Route-by-Route Middleware Cutover
Migrate backend route definitions from `requireRoles(...)` to `requirePermission(...)`.
