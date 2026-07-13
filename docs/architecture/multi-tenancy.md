# Multi-Tenancy Architecture

> **Purpose:** Define the multi-tenant data isolation strategy.
> **Scope:** Tenant model, data isolation, query patterns, tenant lifecycle.
> **Dependencies:** [Application Architecture](application-architecture.md), [User Roles](../product/user-roles.md)

---

## 1. Tenancy Model

NetroTrack uses a **Shared Database, Shared Schema** multi-tenancy model with row-level isolation.

| Model | Description | NetroTrack |
|-------|------------|------------|
| Separate database per tenant | Each tenant has its own database | ❌ Too expensive at scale |
| Separate schema per tenant | Each tenant has its own schema | ❌ Migration complexity |
| **Shared schema, row-level isolation** | All tenants share tables; filtered by `company_id` | ✅ Chosen |

### Why This Model?

- **Cost efficient:** Single database connection, single migration path.
- **Simple operations:** One schema to maintain, one set of indexes.
- **Scales to 10,000+ tenants:** No per-tenant infrastructure.
- **Prisma compatible:** Works naturally with Prisma's query builder.

---

## 2. Data Isolation Strategy

### The Golden Rule

> **Every business table MUST have a `company_id` column. Every query MUST filter by `company_id`.**

### Tables That Require `company_id`

| Table | Reason |
|-------|--------|
| `users` | Employee belongs to a company |
| `attendance_records` | Attendance is company-scoped |
| `gps_tracks` | Location data is company-scoped |
| `customer_visits` | Visits are company-scoped |
| `product_sales` | Sales are company-scoped |
| `inspections` | Inspections are company-scoped |
| `customers` | Customers belong to a company |
| `products` | Products belong to a company |
| `branches` | Branches belong to a company |
| `departments` | Departments belong to a company |
| `designations` | Designations belong to a company |
| `notifications` | Notifications are company-scoped |
| `audit_logs` | Audit trails are company-scoped |

### Tables That Do NOT Have `company_id`

| Table | Reason |
|-------|--------|
| `companies` | IS the tenant — `id` is the tenant identifier |
| `platform_settings` | Global platform configuration |
| `subscriptions` | Linked to company via foreign key |

---

## 3. Tenant Context Injection

### How `companyId` Flows

```
Mobile App → JWT Token (contains companyId and role)
    │
    ▼
Auth Middleware → Validates JWT, extracts payload
    │
    ▼
Tenant Middleware → Injects companyId into request context
    │
    ▼
Controller → Receives req.tenantId (never from body/params)
    │
    ▼
Service → Passes companyId to repository methods
    │
    ▼
Repository → Adds WHERE company_id = $1 to every query
```

### Implementation Pattern

```typescript
// middleware/tenant.middleware.ts
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user; // Set by auth middleware
  
  if (!user?.companyId) {
    throw new AppError('TENANT_REQUIRED', 'Company context is required', 403);
  }
  
  req.tenantId = user.companyId;
  next();
};

// repository pattern
class AttendanceRepository {
  async findByEmployee(companyId: string, employeeId: string) {
    return prisma.attendanceRecord.findMany({
      where: {
        companyId,       // ALWAYS filter by tenant
        employeeId,
      },
    });
  }
}
```

### Critical Rules

| Rule | Enforcement |
|------|------------|
| **Never** accept `companyId` from request body | Middleware derives from JWT |
| **Never** accept `companyId` from URL parameters for data access | URL params for resource ID only |
| **Never** write a query without `companyId` filter | Code review checklist item |
| **Always** include `companyId` in unique constraints where applicable | Database schema |
| **Always** log tenant context in request logs | Pino logger includes tenantId |

---

## 4. Super Admin Tenant Access

Super Admins operate across all tenants. Their access pattern is different:

```typescript
// For Super Admin: no tenant filter (or explicit "all tenants" mode)
if (req.user.role === 'SUPER_ADMIN') {
  // Can access any company's data
  // companyId comes from URL parameter, not JWT
  const targetCompanyId = req.params.companyId;
  // Validate company exists
}

// For all other roles: tenant-scoped
else {
  // companyId from JWT — cannot be overridden
  const companyId = req.tenantId;
}
```

---

## 5. Tenant Lifecycle

### Company Onboarding

```
1. Super Admin creates company
       │
2. Company record created (status: ACTIVE)
       │
3. Client Admin account created
       │
4. Client Admin logs in → configures company
       │
5. Client Admin creates managers and employees
       │
6. Employees log in → begin operations
```

### Company Suspension

```
1. Super Admin suspends company
       │
2. Company status → SUSPENDED
       │
3. All company users' tokens are invalidated
       │
4. Login attempts show "Company suspended" message
       │
5. Data is preserved (not deleted)
       │
6. Super Admin can reactivate at any time
```

### Company Statuses

| Status | Login Allowed | Data Access | API Access |
|--------|:------------:|:-----------:|:----------:|
| `ACTIVE` | ✅ | ✅ | ✅ |
| `SUSPENDED` | ❌ | ❌ | ❌ |
| `TRIAL` (future) | ✅ | ✅ | ✅ (limited) |
| `EXPIRED` (future) | ❌ | Read-only | ❌ |

---

## 6. Data Seeding Pattern

When a new company is created, seed default data:

| Data | Default Value |
|------|-------------|
| Default branch | "Head Office" |
| Default department | "General" |
| Default designation | "Employee" |
| Company settings | Platform defaults |

---

## 7. Cross-Tenant Queries (Super Admin Only)

For platform-level analytics, Super Admin needs cross-tenant queries:

```typescript
// Platform dashboard: total employees across all companies
const totalEmployees = await prisma.user.count({
  where: { role: 'CLIENT_USER', deletedAt: null },
});

// Company comparison: employees per company
const companyStats = await prisma.company.findMany({
  include: {
    _count: { select: { users: true } },
  },
});
```

These queries are ONLY available to Super Admin role and ONLY through dedicated platform endpoints.

---

## 8. Testing Multi-Tenancy

Every feature must be tested with multi-tenant scenarios:

| Test Case | Expected Result |
|-----------|----------------|
| Company A user queries data | Only Company A data returned |
| Company A user submits data | Record created with Company A's `companyId` |
| Company A user tries Company B's resource | 404 Not Found (not 403) |
| Manager queries team | Only assigned employees returned |
| Super Admin queries all companies | All data accessible |
| Suspended company user tries to log in | Login rejected |

---

## Future Considerations

- **Database-level Row-Level Security (RLS):** PostgreSQL RLS policies as an additional safety net.
- **Tenant-specific configuration:** Per-company feature flags, business rules, UI customization.
- **Tenant data export:** Complete data export for regulatory compliance.
- **Tenant data deletion:** GDPR-compliant tenant data purge.
- **Tenant migration:** Moving a tenant to a dedicated database for enterprise customers.

---

## Best Practices

- Treat multi-tenancy as a security boundary, not just a data filter.
- Return 404 (not 403) when a user tries to access another tenant's resource — avoid information leakage.
- Include `companyId` in every log entry for debugging.
- Create integration tests that specifically verify cross-tenant isolation.
- Review every new Prisma query for tenant filtering during code review.
