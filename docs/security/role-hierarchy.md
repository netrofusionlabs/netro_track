# System Role Hierarchy & Role-Based Access Control (RBAC)

> **Purpose:** Define the authoritative system access roles, hierarchy levels, scope boundaries, and atomic workflows.

---

## 1. Access Role Hierarchy

NetroTrack enforces 6 system access roles. Numeric rank dictates authority (higher = greater permissions).

| System Role | Numeric Rank | Administrative Scope | Key Responsibilities |
|-------------|:------------:|---------------------|----------------------|
| `MASTER_SUPER_ADMIN` | **5** | Global System Scope (Exactly 1 account) | System owner, manages Super Admins, immutable |
| `SUPER_ADMIN` | **4** | Global Platform Scope | Manages companies, company settings, Company Admins |
| `COMPANY_ADMIN` | **3** | Single Company Scope (Peer Authority) | Manages HR Executives, Managers & Employees within company |
| `HR` | **2** | Single Company Scope (Optional Role) | Manages Managers & Employees within company |
| `MANAGER` | **1** | Team Scope | Manages assigned employees; auto-assigns created employees to self |
| `EMPLOYEE` | **0** | Self Account Scope | System Access Role: Employee (Access & Permissions) |

*Note: Company Admins can create custom user label roles / designations (e.g., "Software Engineer", "Sales Executive", "Operations Lead") for any user while maintaining standard system access roles for security.*

---

## 2. Master Super Admin Protection Rules

1. **Count Constraint:** Exactly 1 `MASTER_SUPER_ADMIN` account exists system-wide.
2. **Immutability:** The Master Super Admin account CANNOT be deleted, deactivated (`status = INACTIVE`), or demoted by any role.
3. **Creation Restriction:** Only a `MASTER_SUPER_ADMIN` can create or remove a `SUPER_ADMIN`. A `SUPER_ADMIN` cannot create or remove another `SUPER_ADMIN`.

---

## 3. Scope Boundaries & Hierarchy Rules

```
                    MASTER SUPER ADMIN
                           │
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
        SUPER ADMIN    SUPER ADMIN    SUPER ADMIN
                           │
                    ┌──────┴──────┐
                    ↓             ↓
              COMPANY A      COMPANY B
                 │
        ┌────────┼────────┐
        ↓        ↓        ↓
      Admin A  Admin B  Admin C  (Peer Admins — Shared Company Scope)
        │        │        │
        └────────┼────────┘
                 │
        ┌────────┼─────────┐
        ↓        ↓         ↓
     Manager A Manager B Manager C
        │        │         │
       / \      / \        │
      E1 E2    E3 E4      E5

      UNASSIGNED EMPLOYEES (managerId = null)
        ├── E6
        └── E7
```

- **Role-Rank Directory Filter Scoping:** Tab filters in User Management (`All Users`, `Admins`, `HR`, `Managers`, `Employees`, `Unassigned`) are dynamically scoped based on role rank authority. For example, `HR` (Rank 2) accounts cannot view or manage higher rank roles, so the `Admins` filter tab is automatically hidden for HR users. `Manager` (Rank 1) accounts only see `All Users` and `Employees`.
- **HR & Admin Dashboard Customization:** Mobile dashboard headers dynamically customize portal titles and badges based on user role (`HR Portal` with `HR EXECUTIVE` badge for HR, `Admin Portal` for Company Admin, `Super Admin Portal` for Super Admins). System infrastructure status cards are strictly restricted to `SUPER_ADMIN` and `MASTER_SUPER_ADMIN`.
- **GPS Tracking Status:** Dashboard KPIs dynamically display company-wide GPS tracking configuration (`Enabled` / `Disabled`).

---

## 4. Atomic Manager Removal Workflow

When a Manager is deactivated or removed, their assigned employees must never be left orphaned.

The system provides 3 atomic reassignment strategies executed within a single database transaction (`prisma.$transaction`):

1. **Move all to Unassigned (Default / Recommended):** All subordinate employees' `managerId` values are set to `null`.
2. **Move all to another Manager:** All subordinate employees are transferred to a specified active replacement manager in the same company.
3. **Assign individually:** Each employee is individually assigned to a specified replacement manager or set to Unassigned.

If replacement manager validation fails, the entire transaction is rolled back and the manager remains `ACTIVE`.

---

## 5. User Status

Every user record includes a `status` enum column:

- `ACTIVE`: Account operational and allowed to log in.
- `INACTIVE`: Account deactivated. Login attempts are rejected with `403 ACCOUNT_DEACTIVATED`.

---

## 6. Audit Strategy

All role modifications, user creations, deactivations, reactivations, credential resets, and manager removals are recorded in the append-only `audit_logs` database table.

---

## 7. Credential Management & Default Reset Rules

Higher-rank roles (`actorRank > targetRank`) have authority to reset credentials for lower-rank accounts in their administrative scope:

1. **Default Reset Action (`POST /api/v1/user-management/:id/reset-credentials`)**:
   - Password is reset to default (`Password123!`).
   - MPIN is cleared (`mpinHash = null`).
   - On next login, the user must authenticate using their employee ID & default password, then set up a new MPIN (`/api/v1/auth/mpin/setup`).
2. **Rank Authority Constraint**:
   - Master Super Admin (Rank 5) can reset Super Admins, Company Admins, HRs, Managers, and Employees.
   - Super Admin (Rank 4) can reset Company Admins, HRs, Managers, and Employees.
   - Company Admin (Rank 3) can reset HRs, Managers, and Employees within their company.
   - HR Executive (Rank 2) can reset Managers and Employees within their company.
   - Manager (Rank 1) can reset assigned Employees.
   - Lower or equal roles (`actorRank <= targetRank`) CANNOT reset higher or equal rank credentials.

---

## 8. Paginated Server-Side API Search & Directory Filtering

Workforce user list queries (`GET /api/v1/user-management`) enforce backend SQL-level filtering, search, and pagination:

- **Visibility Filter**: The database query enforces `role: { in: allowedRoles }` where `allowedRoles` only includes roles with `targetRank <= actorRank`. Higher-rank roles are hidden at the SQL level.
- **Server-Side Case-Insensitive Search**: `search` parameter queries `name`, `employeeId`, and `email` using PostgreSQL `ILIKE` / `mode: 'insensitive'`.
- **Category Tabs**: `tab` parameter filters `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`, and `UNASSIGNED` directly in the database.
- **Pagination Response Schema**:
  - `data`: Array of user records for the current page.
  - `pagination`: `{ page, pageSize, totalItems, totalPages, hasNext, hasPrevious }`.
