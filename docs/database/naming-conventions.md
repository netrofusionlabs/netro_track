# Database Naming Conventions

> **Purpose:** Establish consistent naming standards for all database objects.
> **Dependencies:** [Schema Reference](schema-reference.md)

---

## Standards

| Object | Convention | Example |
|--------|-----------|---------|
| Tables | snake_case, **plural** | `users`, `customer_visits` |
| Columns | snake_case | `company_id`, `first_name`, `created_at` |
| Primary keys | `id` | `id UUID` |
| Foreign keys | `{referenced_table_singular}_id` | `company_id`, `user_id` |
| Timestamps | `*_at` suffix | `created_at`, `updated_at`, `deleted_at`, `punch_in_at` |
| Booleans | `is_*` or `has_*` prefix | `is_active`, `is_late`, `has_biometric` |
| Enums | PascalCase type, UPPER_SNAKE values | `user_role`: `SUPER_ADMIN`, `CLIENT_USER` |
| Indexes | `idx_{table}_{columns}` | `idx_users_company_id` |
| Unique constraints | `uq_{table}_{columns}` | `uq_users_company_id_employee_id` |
| Junction tables | `{table1}_{table2}` | `manager_assignments` |

## Column Ordering

Every table should follow this column order:
1. `id` (primary key)
2. `company_id` (tenant reference)
3. Foreign keys
4. Business columns
5. Status/flag columns
6. `local_id` (if offline-synced)
7. `created_at`, `updated_at`, `deleted_at`

## Naming Don'ts

- ❌ Don't use reserved words (`user`, `order`, `group`) — use `users`, `orders`, `groups`
- ❌ Don't abbreviate — `department_id` not `dept_id`
- ❌ Don't use `tbl_` or `fk_` prefixes on tables/columns
- ❌ Don't mix camelCase and snake_case
