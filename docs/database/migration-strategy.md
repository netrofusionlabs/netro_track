# Migration Strategy

> **Purpose:** Define the database migration workflow using Prisma.
> **Dependencies:** [Database Overview](database-overview.md)

---

## Prisma Migration Workflow

### Development

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_customer_visits_table

# 3. Apply migration (auto in dev)
# 4. Generate Prisma client
npx prisma generate
```

### Production

```bash
# Apply pending migrations (CI/CD)
npx prisma migrate deploy
```

---

## Migration Naming Convention

```
YYYYMMDDHHMMSS_description_of_change
```

Examples:
```
20250115120000_create_users_table
20250116090000_add_manager_id_to_users
20250120140000_create_attendance_records
20250201100000_add_index_gps_tracks_company_captured
```

---

## Safety Rules

| Rule | Enforcement |
|------|------------|
| Never modify an applied migration file | Create a new migration instead |
| Always test migrations on Neon branch first | Branch before migrating staging/prod |
| No data-destructive migrations without backup | pg_dump before column/table drops |
| All migrations must be reversible | Include down migration steps in comments |
| Never run `prisma migrate reset` in production | Dev only |

---

## Pre-Migration Checklist

- [ ] Neon branch created for testing
- [ ] Migration tested on branch
- [ ] No breaking changes to existing API
- [ ] Rollback plan documented
- [ ] Team notified of migration

---

## Seeding

```typescript
// prisma/seed.ts
// Seed default data for new companies and development

async function seed() {
  // Platform super admin
  await prisma.user.create({ ... });
  
  // Demo company with sample data
  await prisma.company.create({ ... });
}
```

```bash
npx prisma db seed
```
