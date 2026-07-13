# Database Overview

> **Purpose:** Define the database strategy, technology choices, and operational approach.
> **Scope:** PostgreSQL on Neon, connection management, operational procedures.
> **Dependencies:** [System Architecture](../architecture/system-architecture.md)

---

## 1. Technology Choice

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Database | PostgreSQL 15+ | ACID compliant, rich features, strong community |
| Hosting | Neon (managed) | Auto-backup, branching, autoscaling, zero cold start |
| ORM | Prisma | Type-safe queries, migrations, schema management |
| Connection Pooling | Neon built-in (PgBouncer) | Handles connection limits for serverless |

---

## 2. Database Architecture

```
Application (Prisma Client)
        │
        │  Connection string (pooled)
        ▼
Neon Connection Pooler (PgBouncer)
        │
        │  Managed connection pool
        ▼
PostgreSQL Instance (Neon)
        │
        ├── netrotrack_dev      (development)
        ├── netrotrack_staging   (staging)
        └── netrotrack_prod      (production)
```

---

## 3. Schema Design Principles

| Principle | Application |
|-----------|------------|
| UUID primary keys | All tables use UUID v4 |
| Snake_case naming | Tables and columns in snake_case |
| Plural table names | `users`, `companies`, `customer_visits` |
| Soft delete | `deleted_at` timestamp on business tables |
| Audit columns | `created_at`, `updated_at` on every table |
| Tenant isolation | `company_id` on every business table |
| UTC timestamps | All timestamps stored in UTC |
| Referential integrity | Foreign keys with appropriate cascade rules |

---

## 4. Connection Management

### Prisma Configuration

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")        // Pooled connection
  directUrl = env("DIRECT_DATABASE_URL") // Direct (for migrations)
}
```

### Connection Pool Sizing

| Environment | Pool Size | Rationale |
|-------------|:---------:|-----------|
| Development | 5 | Local use |
| Staging | 10 | Testing load |
| Production | 20 | Per Node.js instance |

### Neon Connection Limits

| Plan | Max Connections | Pooler Connections |
|------|:--------------:|:-----------------:|
| Free | 100 | 10,000+ |
| Pro | 300 | 10,000+ |
| Enterprise | Custom | Custom |

Always use the pooled connection string for application queries. Use the direct connection string only for Prisma migrations.

---

## 5. Environments

| Environment | Database | Branch | Purpose |
|-------------|----------|--------|---------|
| Local Dev | Neon Dev Branch | `dev` | Local development |
| Staging | Neon Staging Branch | `staging` | Pre-production testing |
| Production | Neon Main | `main` | Live production |

Neon branching allows creating isolated database copies for testing without affecting production.

---

## 6. Backup Strategy

| Concern | Strategy | Provider |
|---------|---------|---------|
| Point-in-time recovery | Automatic (up to 7 days on Pro) | Neon |
| Daily backups | Automatic | Neon |
| Branch-based backups | Create branch before migrations | Manual |
| Data export | pg_dump for offline backup (monthly) | Manual/Automated |

---

## Future Considerations

- **Read replicas:** Neon read replicas for report queries at scale.
- **Connection pooling upgrade:** Move to ElastiCache-backed PgBouncer if Neon limits are reached.
- **Database branching in CI:** Create Neon branches for PR-specific testing.
- **Row-Level Security:** PostgreSQL RLS as additional tenant isolation layer.
- **TimescaleDB extension:** For GPS time-series data at massive scale.

---

## Best Practices

- Always use the pooled connection for application queries.
- Always use the direct connection for migrations.
- Never expose database credentials in code — use environment variables.
- Create a Neon branch before running destructive migrations.
- Monitor query performance with Prisma query logging in development.
- Review slow queries monthly using Neon's query insights.
