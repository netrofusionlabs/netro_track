# Indexing Strategy

> **Purpose:** Define all database indexes with rationale.
> **Scope:** Primary keys, foreign keys, unique constraints, performance indexes.
> **Dependencies:** [Schema Reference](schema-reference.md)

---

## Index Catalog

### companies
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | Row lookup |
| UQ | `slug` | Unique | URL-friendly lookup |
| IDX | `status` | B-tree | Filter by status |

### users
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | Row lookup |
| UQ | `(company_id, employee_id)` | Unique | Employee ID unique per company |
| IDX | `company_id` | B-tree | Tenant filtering |
| IDX | `role` | B-tree | Role-based queries |
| IDX | `manager_id` | B-tree | Team member lookup |
| IDX | `(company_id, role)` | Composite | Role within company |
| IDX | `(company_id, status)` | Composite | Active employees per company |
| IDX | `branch_id` | B-tree | Branch filtering |
| IDX | `department_id` | B-tree | Department filtering |

### attendance_records
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| UQ | `(company_id, user_id, date)` | Unique | One attendance per employee per day |
| UQ | `local_id` | Unique | Offline sync idempotency |
| IDX | `(company_id, date)` | Composite | Company daily attendance |
| IDX | `(user_id, date)` | Composite | Employee attendance history |
| IDX | `(company_id, status)` | Composite | Currently working employees |

### gps_tracks
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| IDX | `(company_id, user_id, captured_at)` | Composite | Route playback |
| IDX | `(attendance_id, captured_at)` | Composite | Session GPS points |
| IDX | `(company_id, captured_at)` | Composite | Company GPS by date |
| IDX | `captured_at` | B-tree | Partition pruning |

### customer_visits
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| UQ | `local_id` | Unique | Offline sync idempotency |
| IDX | `(company_id, user_id, created_at)` | Composite | Employee visit history |
| IDX | `(company_id, created_at)` | Composite | Company visit reports |
| IDX | `customer_id` | B-tree | Customer visit history |

### product_sales
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| UQ | `local_id` | Unique | Offline sync idempotency |
| IDX | `(company_id, user_id, created_at)` | Composite | Employee sales history |
| IDX | `(company_id, created_at)` | Composite | Company sales reports |
| IDX | `customer_id` | B-tree | Customer sales history |

### inspections
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| UQ | `local_id` | Unique | Offline sync idempotency |
| IDX | `(company_id, user_id, created_at)` | Composite | Employee inspection history |
| IDX | `(company_id, created_at)` | Composite | Company inspection reports |

### audit_logs
| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| PK | `id` | Primary Key | |
| IDX | `(company_id, created_at)` | Composite | Company audit trail |
| IDX | `(user_id, created_at)` | Composite | User activity trail |
| IDX | `(entity_type, entity_id)` | Composite | Entity change history |

---

## Indexing Rules

1. **Index all foreign keys** — PostgreSQL does NOT auto-index foreign keys.
2. **Index `company_id`** on every business table — critical for tenant isolation.
3. **Composite indexes** follow the left-prefix rule — put the most selective column first.
4. **Don't over-index** — each index slows writes. Add indexes based on actual query patterns.
5. **Monitor** — Use `EXPLAIN ANALYZE` and Neon query insights to validate index usage.

---

## Best Practices

- Review index usage quarterly — drop unused indexes.
- Add indexes for new query patterns as features are built.
- Use partial indexes where appropriate (e.g., `WHERE deleted_at IS NULL`).
- Consider GiST indexes for geospatial queries if needed in future.
