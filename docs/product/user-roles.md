# User Roles

> **Purpose:** Define all user roles, their permissions, and access boundaries.
> **Scope:** Role hierarchy, permission matrix, data access rules.
> **Dependencies:** [Product Overview](product-overview.md)

---

## 1. Role Hierarchy

```
Master Super Admin (Rank 5)
    │
    ├── Super Admin (Rank 4)
    │       │
    │       ├── Company Admin (Rank 3 - Peer Authority)
    │       │       │
    │       │       ├── HR Executive (Rank 2 - Single Company Scope)
    │       │       │       │
    │       │       │       ├── Manager (Rank 1 - Team Scope)
    │       │       │       │       │
    │       │       │       │       └── Employee (Rank 0 - Assigned Team)
    │       │       │       │
    │       │       │       └── Employee (Rank 0 - Unassigned Company Pool)
```

---

## 2. Role Definitions

### 2.1 Super Admin

**Identity:** Platform owner. The entity that owns and operates the entire NetroTrack SaaS platform.

**Scope:** Global — spans all companies and all data.

| Capability | Description |
|-----------|------------|
| Create Companies | Onboard new organizations |
| Edit Companies | Modify company profiles and settings |
| Suspend Companies | Temporarily disable company access |
| Activate Companies | Re-enable suspended companies |
| Create Client Admins | Assign admin users to companies |
| Create Managers | Create managers within any company |
| Create Users | Create employees within any company |
| Platform Dashboard | Global analytics and system health |
| Subscription Management | Manage company subscriptions |
| Billing (future) | Invoice and payment management |
| Platform Analytics | Usage metrics, growth tracking |
| Global Reports | Cross-company operational reports |

**Data Access:** ALL companies, ALL data.

---

### 2.2 Client Admin

**Identity:** Represents an organization (company/tenant). Typically the business owner, HR manager, or operations head.

**Scope:** Single company — can see and manage everything within their company, nothing outside.

| Capability | Description |
|-----------|------------|
| Company Profile | Edit company name, logo, settings |
| Branches | Create and manage company branches |
| Departments | Create and manage departments |
| Designations | Define employee designations |
| Managers | Create and manage manager accounts |
| Users | Create, edit, suspend, reactivate employees |
| Reports | View all company reports |
| Attendance Dashboard | Company-wide attendance overview |
| Company Settings | Configure company-specific behavior |
| Reset MPINs | Reset employee MPINs |

**Data Access:** Own company only. Cannot see any other company's data.

---

### 2.3 Client Manager

**Identity:** Responsible for a team of field employees. Typically a regional manager, team lead, or supervisor.

**Scope:** Assigned employees within their company only.

| Capability | Description |
|-----------|------------|
| Team Dashboard | Overview of assigned employees |
| Live Team Tracking | Real-time location of team members |
| Attendance | View team attendance records |
| Visits | Review team customer visits |
| Sales | Review team sales records |
| Inspections | Review team inspections |
| Team Reports | Generate reports for assigned team |
| Productivity | View team productivity metrics |

**Data Access:** Only employees explicitly assigned to this manager. Cannot see other managers' teams. Cannot see other companies' data.

**Critical Rule:** Managers should ONLY see employees assigned to them, not all company employees.

---

### 2.4 Client User

**Identity:** Field employee who performs daily field operations.

**Scope:** Own data only.

| Capability | Description |
|-----------|------------|
| Login | Authenticate via password, MPIN, or biometric |
| MPIN | Set and use MPIN for quick login |
| Punch In | Start daily attendance and tracking |
| Punch Out | End daily attendance and tracking |
| Live Tracking | Automatic background GPS tracking |
| Customer Visit | Create visits with GPS, photos, notes |
| Sales | Record product sales |
| Inspection | Record field inspections |
| Profile | View and edit personal profile |
| History | View personal attendance, visit, sales history |

**Data Access:** Own data only. Cannot see other employees' data. Cannot access management features.

---

## 3. Permission Matrix

### Core Permissions

| Permission | Master Super Admin | Super Admin | Company Admin | HR Executive | Manager | Field Employee |
|-----------|:------------------:|:-----------:|:-------------:|:------------:|:-------:|:--------------:|
| **Companies** |
| Create Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Company | ✅ | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Suspend Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Companies | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** |
| Create Admin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create HR | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Manager | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Employee | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reset Credentials (Default) | ✅ | ✅ | ✅ (< Rank 3) | ✅ (< Rank 2) | ✅ (Team) | ❌ |
| View Employees | ✅ | ✅ | ✅ (Company) | ✅ (Company) | ✅ (Team) | ❌ |
| **Attendance** |
| Punch In/Out | ❌ | ❌ | ❌ | ✅ |
| View Own Attendance | ❌ | ❌ | ❌ | ✅ |
| View Team Attendance | ❌ | ❌ | ✅ | ❌ |
| View Company Attendance | ✅ | ✅ | ❌ | ❌ |
| **Tracking** |
| Background GPS | ❌ | ❌ | ❌ | ✅ (auto) |
| View Team Locations | ❌ | ❌ | ✅ | ❌ |
| View Company Locations | ✅ | ✅ | ❌ | ❌ |
| **Visits / Sales / Inspections** |
| Create | ❌ | ❌ | ❌ | ✅ |
| View Own | ❌ | ❌ | ❌ | ✅ |
| View Team | ❌ | ❌ | ✅ | ❌ |
| View Company | ✅ | ✅ | ❌ | ❌ |
| **Reports** |
| Personal Reports | ❌ | ❌ | ❌ | ✅ |
| Team Reports | ❌ | ❌ | ✅ | ❌ |
| Company Reports | ✅ | ✅ | ❌ | ❌ |
| Platform Reports | ✅ | ❌ | ❌ | ❌ |
| **Settings** |
| Platform Settings | ✅ | ❌ | ❌ | ❌ |
| Company Settings | ✅ | ✅ | ❌ | ❌ |
| Personal Settings | ✅ | ✅ | ✅ | ✅ |

---

## 4. Data Isolation Rules

### Company Isolation (Tenant Boundary)

```
Company A ──── Data boundary ──── Company B
   │                                  │
   ├── Employees A                    ├── Employees B
   ├── Attendance A                   ├── Attendance B
   ├── Visits A                       ├── Visits B
   ├── Sales A                        ├── Sales B
   └── Reports A                      └── Reports B
```

- A company CANNOT access another company's data.
- Every query MUST filter by `companyId`.
- `companyId` MUST be derived from the JWT, never from request parameters.

### Manager Isolation (Team Boundary)

```
Manager X ──── Team boundary ──── Manager Y
   │                                  │
   ├── Employee 1                     ├── Employee 4
   ├── Employee 2                     ├── Employee 5
   └── Employee 3                     └── Employee 6
```

- Managers see ONLY their assigned employees.
- Manager assignment is explicit (not implied by department or branch).

### Employee Isolation (Personal Boundary)

- Employees see ONLY their own data.
- An employee cannot view another employee's attendance, visits, or location.

---

## 5. Role Assignment Rules

| Rule | Description |
|------|------------|
| Every employee belongs to exactly one company | No cross-company membership |
| Every manager belongs to exactly one company | Manager scope is company-wide but team-filtered |
| Client Admin is per company | One or more admins per company |
| Super Admin is platform-wide | Typically 1–3 super admins |
| Employees can be reassigned to different managers | Historical data remains intact |
| Suspended users cannot log in | But their data is preserved |

---

## 6. Future Role Considerations

| Future Role | Purpose |
|-------------|---------|
| **Read-Only Manager** | View-only access to team data (no edit) |
| **Regional Admin** | Admin scoped to a branch/region |
| **API User** | Machine-to-machine access for integrations |
| **Support Agent** | Limited read access for customer support |

The RBAC system should be designed to accommodate additional roles without schema changes.

---

---

## 7. Access Role vs. Designation / Job Title

| Dimension | System Access Role | Designation / Job Title |
|-----------|-------------------|------------------------|
| **Purpose** | System-level security & authorization tier | HR job title / professional position |
| **Examples** | `MASTER_SUPER_ADMIN`, `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` | `HR Manager`, `Senior Software Engineer`, `Sales Specialist` |
| **Visibility** | HR Executives & Admins only (hidden from regular employees) | Publicly visible on employee profile cards |
| **Editable By** | HR Executives (Rank >= 2) & Admins only | HR Executives (Rank >= 2) & Admins |
| **Self Edit** | 🚫 Strictly forbidden (`403 FORBIDDEN_SELF_ROLE_EDIT`) | Allowed only via HR approval |
| **Audit Engine** | Logged as `ACCESS_ROLE_CHANGED` on timeline | Logged as `DESIGNATION_CHANGED` or `PROMOTION` on timeline |

### Key Authorization Rules for Role Modifications
1. **Self-Role Edit Lock:** A user CANNOT alter their own Access Role via API (`403 FORBIDDEN_SELF_ROLE_EDIT`).
2. **Rank Hierarchy Requirement:** To change another user's Access Role, the actor's Access Role rank must be **Rank 2 (HR)** or higher, AND greater than the target user's current rank.
3. **Timeline Immutability:** Any change to Access Role or Designation MUST generate an atomic audit record in `user_timeline_events`.

---

## Best Practices

- Always verify both authentication AND authorization on every API endpoint.
- Never trust client-side role claims — validate from the JWT/database.
- Log all permission violations for security auditing.
- Test every API endpoint with all role ranks to verify access control.
- Design the permission system to be extensible for future roles.
