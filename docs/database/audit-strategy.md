# Audit Strategy

> **Purpose:** Define the audit logging approach for compliance and security.
> **Dependencies:** [Schema Reference](schema-reference.md)

---

## 1. Audit Columns (Every Table)

Every table includes automatic audit timestamps:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `created_at` | TIMESTAMPTZ | NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOW() (auto-updated) | Last modification time |

Prisma handles `updated_at` automatically via `@updatedAt`.

---

## 2. Audit Log Table

For security-critical and compliance-relevant actions, a dedicated `audit_logs` table captures the full change history.

### What to Audit

| Action | Entity | Priority |
|--------|--------|:--------:|
| Login success | User | 🔴 High |
| Login failure | User | 🔴 High |
| Logout | User | 🟡 Medium |
| Password change | User | 🔴 High |
| MPIN reset | User | 🔴 High |
| User created | User | 🟡 Medium |
| User suspended | User | 🔴 High |
| User role changed | User | 🔴 High |
| Company created | Company | 🟡 Medium |
| Company suspended | Company | 🔴 High |
| Company settings changed | CompanySettings | 🟡 Medium |
| Attendance punch in | Attendance | 🟢 Low |
| Attendance punch out | Attendance | 🟢 Low |
| Visit created | CustomerVisit | 🟢 Low |
| Sale created | ProductSale | 🟢 Low |
| Inspection created | Inspection | 🟢 Low |
| Device registered | Device | 🟡 Medium |
| Device deregistered | Device | 🟡 Medium |
| Data export | Export | 🔴 High |

### Audit Log Record

```typescript
{
  id: "uuid",
  companyId: "company-uuid",
  userId: "user-uuid",
  action: "USER_SUSPENDED",
  entityType: "User",
  entityId: "target-user-uuid",
  oldValues: { status: "ACTIVE" },
  newValues: { status: "SUSPENDED" },
  ipAddress: "192.168.1.1",
  userAgent: "NetroTrack/1.0.0 (Android 14)",
  createdAt: "2025-01-15T10:30:00Z"
}
```

---

## 3. Implementation Pattern

```typescript
// Audit service
class AuditService {
  async log(params: {
    companyId?: string;
    userId?: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Write-only, append-only — never update or delete audit logs
    await this.auditRepo.create(params);
  }
}
```

---

## 4. Retention

| Data | Retention | Rationale |
|------|-----------|-----------|
| Security events (login, auth failures) | 2 years | Compliance |
| Data modification events | 1 year | Business audit |
| Routine events (visits, attendance) | 6 months | Storage optimization |

---

## Best Practices

- Audit logs are **append-only** — never update or delete them.
- Never store sensitive data (passwords, tokens) in audit values.
- Write audits asynchronously (BullMQ job) to avoid blocking the main request.
- Include IP address and user agent for security forensics.
- Index `(company_id, created_at)` and `(user_id, created_at)` for querying.
