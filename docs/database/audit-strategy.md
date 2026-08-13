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

## 3. Professional Timeline Audit Engine (`user_timeline_events`)

In addition to general system audit logs, NetroTrack features a specialized, transactional **Professional Timeline Audit Engine** that records an immutable history of every employee's career progression and organizational milestones.

### Event Types (`TimelineEventType`)

| Event Type | Category | Description | Trigger |
|------------|----------|-------------|---------|
| `ONBOARDING` | Milestone | Initial employee joining & profile creation | `createUser` API |
| `DESIGNATION_ASSIGNED` | HR | Initial job title assignment | `createUser` API |
| `DESIGNATION_CHANGED` | HR | Job title modification (standard transfer/update) | `updateUser` API |
| `PROMOTION` | HR / Career | Official career advancement / title upgrade | `updateUser` API (`isPromotion = true`) |
| `ACCESS_ROLE_ASSIGNED` | Security | Initial system access role assignment | `createUser` API |
| `ACCESS_ROLE_CHANGED` | Security | Permission tier escalation or adjustment | `updateUser` API |
| `MANAGER_ASSIGNED` | Hierarchy | Initial reporting supervisor assignment | `createUser` API |
| `MANAGER_CHANGED` | Hierarchy | Supervisor reassignment or team transfer | `updateUser` API |
| `EMPLOYMENT_TYPE_CHANGED` | HR | Full-time / Part-time / Contract status change | `updateUser` API |
| `LOCATION_CHANGED` | Operations | Primary work location / branch transfer | `updateUser` API |
| `DEPARTMENT_CHANGED` | Operations | Department reassignment | `updateUser` API |
| `COMPANY_CHANGED` | Corporate | Inter-company corporate transfer | Admin migration |

### Transactional Engine Pattern

User entity mutations and timeline event creations execute atomically inside a single `prisma.$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Mutate User record
  const updatedUser = await tx.user.update({ where: { id: targetId }, data: updates });

  // 2. Record immutable timeline audit event
  if (isDesignationChanged) {
    await timelineRepo.createTimelineEventInTx(tx, {
      userId: targetId,
      companyId: actor.companyId,
      eventType: input.isPromotion ? 'PROMOTION' : 'DESIGNATION_CHANGED',
      title: input.isPromotion ? 'Promoted' : 'Designation Updated',
      previousValue: target.designation?.name,
      newValue: input.designationName,
      changedByUserId: actor.id,
      changedByName: actor.name,
      effectiveDate: new Date(),
    });
  }
});
```

### Static Author Snapshots

Timeline records store `changedByUserId` and `changedByName` as static snapshots at creation time so audit logs remain accurate even if the editing HR user later leaves the company or changes names.

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
