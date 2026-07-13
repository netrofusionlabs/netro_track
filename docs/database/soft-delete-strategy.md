# Soft Delete Strategy

> **Purpose:** Define the soft delete pattern for preserving business data.
> **Dependencies:** [Schema Reference](schema-reference.md)

---

## Pattern

Business data is never physically deleted. Instead, records are marked with a `deleted_at` timestamp.

```typescript
// Prisma middleware for soft delete
prisma.$use(async (params, next) => {
  // Intercept delete → set deleted_at
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  
  // Intercept findMany → filter out deleted
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args.where) params.args.where = {};
    params.args.where.deletedAt = null;
  }
  
  return next(params);
});
```

## Tables with Soft Delete

| Table | Has `deleted_at` | Rationale |
|-------|:----------------:|-----------|
| `companies` | ✅ | Preserve historical data |
| `users` | ✅ | Preserve employee records |
| `branches` | ✅ | Referenced by users |
| `departments` | ✅ | Referenced by users |
| `designations` | ✅ | Referenced by users |
| `customers` | ✅ | Referenced by visits/sales |
| `products` | ✅ | Referenced by sales |
| `customer_visits` | ✅ | Business records |
| `product_sales` | ✅ | Business records |
| `inspections` | ✅ | Business records |
| `announcements` | ✅ | Content management |

## Tables WITHOUT Soft Delete

| Table | Rationale |
|-------|-----------|
| `gps_tracks` | Volume data — use retention policy instead |
| `audit_logs` | Append-only — never delete |
| `refresh_tokens` | Hard delete expired/revoked tokens |
| `fcm_tokens` | Hard delete stale tokens |
| `devices` | Deactivate (is_active=false), don't soft delete |
| `visit_images` | Lifecycle tied to parent visit |
| `inspection_images` | Lifecycle tied to parent inspection |
| `sale_items` | Lifecycle tied to parent sale |

## Querying Deleted Records

```typescript
// Normal query: excludes deleted
const users = await prisma.user.findMany({ where: { companyId } });

// Include deleted (admin/audit): explicitly include deleted_at
const allUsers = await prisma.user.findMany({
  where: { companyId, deletedAt: { not: null } },
});
```

## Best Practices

- Default queries should ALWAYS exclude soft-deleted records.
- Only admin/audit endpoints should access soft-deleted data.
- Consider periodic hard deletion of very old soft-deleted records (> 2 years).
- Unique constraints should account for soft delete: `WHERE deleted_at IS NULL`.
