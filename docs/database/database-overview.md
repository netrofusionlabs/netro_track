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

## 5. Storage Capacity Limits (0.5 GB Neon Free Tier)

For configurations utilizing a standard database tier capped at **0.5 GB / 500 MB** of storage (such as the Neon Free Tier), database capacities are projected as follows:

### Average Record Sizing & Capacity Projections
*   **Static Metadata** (Companies, Users, Branches, Departments): **~300 - 400 bytes** per record.
*   **Operational Records** (Visits, Sales, Inspections): **~500 bytes** per record (image files are offloaded to Cloudflare R2, leaving only URLs).
*   **GPS Tracking Points** (Time-series logs): **~200 - 250 bytes** per record (including database index overhead).

### Maximum Record Capacities (Standalone)
*   **Static/Business Data Only:** Can house **~1.25 Million records**.
*   **GPS Coordinates Only:** Can house **~2.2 Million records**.

### Real-World Operational Lifespan (GPS Data Impact)
Active background GPS tracking generates the bulk of database writes. An employee working an 8-hour shift generates **~960 GPS points per day** (assuming 30-second adaptive tracking).

| Active Employees | Daily GPS Points Generated | Estimated Days to Fill 0.5 GB |
|------------------|---------------------------|-------------------------------|
| **50**           | 48,000                    | **~41 Days**                  |
| **100**          | 96,000                    | **~20 Days**                  |
| **500**          | 480,000                   | **~4 Days**                   |
| **1,000**        | 960,000                   | **~2 Days**                   |

*Note: Retention and aggregation policies (e.g. archiving raw points after 14-30 days) must be active to prevent running out of database space at V1 launch scales unless the database plan is upgraded.*

---

## 6. Environments

| Environment | Database | Branch | Purpose |
|-------------|----------|--------|---------|
| Local Dev | Neon Dev Branch | `dev` | Local development |
| Staging | Neon Staging Branch | `staging` | Pre-production testing |
| Production | Neon Main | `main` | Live production |

Neon branching allows creating isolated database copies for testing without affecting production.

---

## 7. Backup Strategy

| Concern | Strategy | Provider |
|---------|---------|---------|
| Point-in-time recovery | Automatic (up to 7 days on Pro) | Neon |
| Daily backups | Automatic | Neon |
| Branch-based backups | Create branch before migrations | Manual |
| Data export | pg_dump for offline backup (monthly) | Manual/Automated |

---

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
