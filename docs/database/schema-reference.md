# Schema Reference

> **Purpose:** Complete column-level reference for all database tables.
> **Scope:** Supplementary tables not covered in detail by the ERD document.
> **Dependencies:** [Entity Relationship](entity-relationship.md)

---

## Supporting Entities

### devices

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → users.id, NOT NULL | User who owns device |
| `device_id` | VARCHAR(255) | NOT NULL | Unique device identifier |
| `platform` | ENUM | NOT NULL | IOS, ANDROID |
| `model` | VARCHAR(100) | NULLABLE | Device model name |
| `os_version` | VARCHAR(20) | NULLABLE | OS version |
| `app_version` | VARCHAR(20) | NULLABLE | App version installed |
| `is_active` | BOOLEAN | DEFAULT true | Currently registered device |
| `registered_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When device was registered |
| `last_seen_at` | TIMESTAMPTZ | NULLABLE | Last activity from device |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### refresh_tokens

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → users.id, NOT NULL | Token owner |
| `token_hash` | TEXT | NOT NULL, UNIQUE | Hashed refresh token |
| `device_id` | UUID | FK → devices.id, NULLABLE | Associated device |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Token expiry |
| `is_revoked` | BOOLEAN | DEFAULT false | Manually revoked |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### branches

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Branch name |
| `address` | TEXT | NULLABLE | Physical address |
| `latitude` | DECIMAL(10,7) | NULLABLE | Branch GPS lat |
| `longitude` | DECIMAL(10,7) | NULLABLE | Branch GPS lng |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | |

### departments

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `branch_id` | UUID | FK → branches.id, NULLABLE | Optional branch assignment |
| `name` | VARCHAR(255) | NOT NULL | Department name |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | |

### designations

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Designation title |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | |

### customers

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Customer name |
| `phone` | VARCHAR(20) | NULLABLE | Contact phone |
| `email` | VARCHAR(255) | NULLABLE | Contact email |
| `address` | TEXT | NULLABLE | Address |
| `village` | VARCHAR(255) | NULLABLE | Village/area |
| `latitude` | DECIMAL(10,7) | NULLABLE | Customer GPS lat |
| `longitude` | DECIMAL(10,7) | NULLABLE | Customer GPS lng |
| `type` | VARCHAR(50) | NULLABLE | Customer type (dealer, farmer, etc.) |
| `created_by` | UUID | FK → users.id, NULLABLE | Who created this customer |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | |

### products

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `sku` | VARCHAR(100) | NULLABLE | Stock keeping unit |
| `description` | TEXT | NULLABLE | Product description |
| `unit` | VARCHAR(50) | NULLABLE | Unit of measure (kg, ltr, pc) |
| `price` | DECIMAL(10,2) | NULLABLE | Default price |
| `image_url` | TEXT | NULLABLE | Product image (R2 URL) |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | |

### visit_images

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `visit_id` | UUID | FK → customer_visits.id, NOT NULL | Parent visit |
| `image_url` | TEXT | NOT NULL | R2 image URL |
| `type` | ENUM | NOT NULL | SELFIE, CUSTOMER_PHOTO, PRODUCT_PHOTO |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### inspection_images

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `inspection_id` | UUID | FK → inspections.id, NOT NULL | Parent inspection |
| `image_url` | TEXT | NOT NULL | R2 image URL |
| `caption` | VARCHAR(255) | NULLABLE | Image caption |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### notifications

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NOT NULL | |
| `user_id` | UUID | FK, NULLABLE | Target user (null = broadcast) |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `body` | TEXT | NOT NULL | Notification content |
| `type` | VARCHAR(50) | NOT NULL | ATTENDANCE_REMINDER, TASK_ASSIGNED, ANNOUNCEMENT, etc. |
| `data` | JSONB | NULLABLE | Additional data payload |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `sent_at` | TIMESTAMPTZ | NULLABLE | When FCM was sent |
| `read_at` | TIMESTAMPTZ | NULLABLE | When user read it |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### audit_logs

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NULLABLE | Null for platform-level actions |
| `user_id` | UUID | FK, NULLABLE | Who performed the action |
| `action` | VARCHAR(100) | NOT NULL | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc. |
| `entity_type` | VARCHAR(100) | NOT NULL | User, Attendance, Visit, etc. |
| `entity_id` | UUID | NULLABLE | ID of affected entity |
| `old_values` | JSONB | NULLABLE | Previous state |
| `new_values` | JSONB | NULLABLE | New state |
| `ip_address` | VARCHAR(45) | NULLABLE | Client IP |
| `user_agent` | TEXT | NULLABLE | Client user agent |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### company_settings

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, UNIQUE, NOT NULL | One settings row per company |
| `work_start_time` | TIME | NULLABLE | Expected work start time |
| `work_end_time` | TIME | NULLABLE | Expected work end time |
| `late_threshold_minutes` | INTEGER | DEFAULT 15 | Minutes after start = late |
| `require_selfie_for_visits` | BOOLEAN | DEFAULT false | Selfie mandatory? |
| `require_photos_for_inspections` | BOOLEAN | DEFAULT false | Photos mandatory? |
| `gps_tracking_interval_seconds` | INTEGER | DEFAULT 30 | GPS capture interval |
| `max_devices_per_user` | INTEGER | DEFAULT 1 | Allowed devices |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### fcm_tokens

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, NOT NULL | Token owner |
| `device_id` | UUID | FK → devices.id, NOT NULL | Associated device |
| `token` | TEXT | NOT NULL | FCM registration token |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### announcements

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `company_id` | UUID | FK, NULLABLE | Null = platform-wide |
| `created_by` | UUID | FK → users.id, NOT NULL | Author |
| `title` | VARCHAR(255) | NOT NULL | |
| `body` | TEXT | NOT NULL | |
| `target_role` | ENUM | NULLABLE | Specific role or null for all |
| `is_active` | BOOLEAN | DEFAULT true | |
| `published_at` | TIMESTAMPTZ | NULLABLE | |
| `expires_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

## Enum Types

```sql
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_USER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE company_status AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED');
CREATE TYPE attendance_status AS ENUM ('WORKING', 'COMPLETED');
CREATE TYPE device_platform AS ENUM ('IOS', 'ANDROID');
CREATE TYPE visit_image_type AS ENUM ('SELFIE', 'CUSTOMER_PHOTO', 'PRODUCT_PHOTO');
```
