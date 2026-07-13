# Entity Relationship Diagram

> **Purpose:** Define all database entities and their relationships.
> **Scope:** Complete ERD for the NetroTrack platform.
> **Dependencies:** [Database Overview](database-overview.md), [User Roles](../product/user-roles.md)

---

## 1. Entity Catalog

### Core Entities (25 tables)

| # | Entity | Table Name | Description |
|---|--------|-----------|-------------|
| 1 | Company | `companies` | Tenant / organization |
| 2 | User | `users` | All users (all roles) |
| 3 | Device | `devices` | Registered user devices |
| 4 | Refresh Token | `refresh_tokens` | JWT refresh token store |
| 5 | Branch | `branches` | Company branches/locations |
| 6 | Department | `departments` | Company departments |
| 7 | Designation | `designations` | Employee job titles |
| 8 | Manager Assignment | `manager_assignments` | Manager-employee mapping |
| 9 | Attendance Record | `attendance_records` | Daily attendance (punch in/out) |
| 10 | GPS Track | `gps_tracks` | Individual GPS data points |
| 11 | Customer | `customers` | Company's customers |
| 12 | Customer Visit | `customer_visits` | Visit records |
| 13 | Visit Image | `visit_images` | Images attached to visits |
| 14 | Product | `products` | Company's product catalog |
| 15 | Product Sale | `product_sales` | Sale transactions |
| 16 | Sale Item | `sale_items` | Individual items in a sale |
| 17 | Inspection | `inspections` | Field inspection records |
| 18 | Inspection Image | `inspection_images` | Images attached to inspections |
| 19 | Notification | `notifications` | Push notification records |
| 20 | Audit Log | `audit_logs` | System audit trail |
| 21 | Company Settings | `company_settings` | Per-company configuration |
| 22 | Subscription | `subscriptions` | Company subscription (future) |
| 23 | Announcement | `announcements` | Company/platform announcements |
| 24 | FCM Token | `fcm_tokens` | Firebase Cloud Messaging tokens |
| 25 | App Version | `app_versions` | Minimum app version tracking |

---

## 2. Entity Relationship Diagram

```
┌──────────────┐
│  companies   │
│──────────────│
│ id (PK)      │
│ name         │
│ status       │
│ logo_url     │
│ ...          │
└──────┬───────┘
       │
       │ 1:N
       │
       ├────────────────┬────────────────┬────────────────┐
       │                │                │                │
┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐ ┌─────┴──────────┐
│    users     │ │  branches    │ │ departments  │ │ designations   │
│──────────────│ │──────────────│ │──────────────│ │────────────────│
│ id (PK)      │ │ id (PK)      │ │ id (PK)      │ │ id (PK)        │
│ company_id   │ │ company_id   │ │ company_id   │ │ company_id     │
│ role         │ │ name         │ │ name         │ │ name           │
│ employee_id  │ │ address      │ │ branch_id    │ │ ...            │
│ branch_id    │ │ ...          │ │ ...          │ └────────────────┘
│ department_id│ └──────────────┘ └──────────────┘
│ designation_id│
│ manager_id   │
│ ...          │
└──────┬───────┘
       │
       │ 1:N
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
┌──────┴───────┐  ┌───────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐
│ attendance   │  │  gps_tracks  │  │   customer   │  │  inspections │
│ _records     │  │              │  │   _visits    │  │              │
│──────────────│  │──────────────│  │──────────────│  │──────────────│
│ id (PK)      │  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
│ company_id   │  │ company_id   │  │ company_id   │  │ company_id   │
│ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
│ punch_in_at  │  │ attendance_id│  │ customer_id  │  │ site_name    │
│ punch_out_at │  │ latitude     │  │ latitude     │  │ latitude     │
│ date         │  │ longitude    │  │ longitude    │  │ longitude    │
│ ...          │  │ captured_at  │  │ selfie_url   │  │ observation  │
└──────────────┘  │ ...          │  │ notes        │  │ ...          │
                  └──────────────┘  │ ...          │  └──────┬───────┘
                                    └──────┬───────┘         │
                                           │                 │ 1:N
                                           │ 1:N             │
                                    ┌──────┴───────┐  ┌──────┴───────┐
                                    │ visit_images │  │ inspection   │
                                    │──────────────│  │ _images      │
                                    │ id (PK)      │  │──────────────│
                                    │ visit_id(FK) │  │ id (PK)      │
                                    │ image_url    │  │ inspection_id│
                                    │ type         │  │ image_url    │
                                    └──────────────┘  └──────────────┘
```

---

## 3. Detailed Entity Definitions

### companies

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Company name |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly identifier |
| `status` | ENUM | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, SUSPENDED, TRIAL |
| `logo_url` | TEXT | NULLABLE | Company logo (R2 URL) |
| `email` | VARCHAR(255) | NULLABLE | Contact email |
| `phone` | VARCHAR(20) | NULLABLE | Contact phone |
| `address` | TEXT | NULLABLE | Company address |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | Company timezone |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft delete |

---

### users

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK → companies.id, NOT NULL | Tenant reference |
| `employee_id` | VARCHAR(50) | NOT NULL | Company-specific employee ID |
| `role` | ENUM | NOT NULL | SUPER_ADMIN, CLIENT_ADMIN, CLIENT_MANAGER, CLIENT_USER |
| `first_name` | VARCHAR(100) | NOT NULL | First name |
| `last_name` | VARCHAR(100) | NOT NULL | Last name |
| `email` | VARCHAR(255) | NULLABLE | Email address |
| `phone` | VARCHAR(20) | NULLABLE | Phone number |
| `password_hash` | TEXT | NOT NULL | Argon2 password hash |
| `mpin_hash` | TEXT | NULLABLE | Argon2 MPIN hash |
| `avatar_url` | TEXT | NULLABLE | Profile photo (R2 URL) |
| `branch_id` | UUID | FK → branches.id, NULLABLE | Assigned branch |
| `department_id` | UUID | FK → departments.id, NULLABLE | Assigned department |
| `designation_id` | UUID | FK → designations.id, NULLABLE | Job title |
| `manager_id` | UUID | FK → users.id, NULLABLE | Direct manager |
| `status` | ENUM | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, SUSPENDED, INACTIVE |
| `is_biometric_enabled` | BOOLEAN | DEFAULT false | Biometric login enabled |
| `last_login_at` | TIMESTAMPTZ | NULLABLE | Last successful login |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft delete |

**Unique Constraint:** `(company_id, employee_id)` — employee IDs are unique within a company.

---

### attendance_records

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK → companies.id, NOT NULL | Tenant |
| `user_id` | UUID | FK → users.id, NOT NULL | Employee |
| `date` | DATE | NOT NULL | Attendance date |
| `punch_in_at` | TIMESTAMPTZ | NOT NULL | Punch in timestamp |
| `punch_out_at` | TIMESTAMPTZ | NULLABLE | Punch out timestamp |
| `punch_in_latitude` | DECIMAL(10,7) | NOT NULL | Punch in GPS lat |
| `punch_in_longitude` | DECIMAL(10,7) | NOT NULL | Punch in GPS lng |
| `punch_out_latitude` | DECIMAL(10,7) | NULLABLE | Punch out GPS lat |
| `punch_out_longitude` | DECIMAL(10,7) | NULLABLE | Punch out GPS lng |
| `working_minutes` | INTEGER | NULLABLE | Calculated working time |
| `total_distance_meters` | INTEGER | NULLABLE | Total distance traveled |
| `status` | ENUM | NOT NULL, DEFAULT 'WORKING' | WORKING, COMPLETED |
| `is_late` | BOOLEAN | DEFAULT false | Late punch in flag |
| `is_early_exit` | BOOLEAN | DEFAULT false | Early punch out flag |
| `local_id` | UUID | UNIQUE | Idempotency key for offline sync |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Unique Constraint:** `(company_id, user_id, date)` — one attendance per employee per day.

---

### gps_tracks

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Local UUID (idempotency) |
| `company_id` | UUID | FK → companies.id, NOT NULL | Tenant |
| `user_id` | UUID | FK → users.id, NOT NULL | Employee |
| `attendance_id` | UUID | FK → attendance_records.id, NOT NULL | Linked attendance session |
| `latitude` | DECIMAL(10,7) | NOT NULL | GPS latitude |
| `longitude` | DECIMAL(10,7) | NOT NULL | GPS longitude |
| `accuracy` | REAL | NOT NULL | Accuracy in meters |
| `speed` | REAL | NULLABLE | Speed in m/s |
| `heading` | REAL | NULLABLE | Heading in degrees |
| `altitude` | REAL | NULLABLE | Altitude in meters |
| `battery_level` | SMALLINT | NULLABLE | Battery percentage |
| `battery_charging` | BOOLEAN | NULLABLE | Is device charging |
| `network_type` | VARCHAR(20) | NULLABLE | wifi, cellular, none |
| `gps_provider` | VARCHAR(20) | NULLABLE | gps, network, fused |
| `is_accurate` | BOOLEAN | DEFAULT true | accuracy <= 100m |
| `captured_at` | TIMESTAMPTZ | NOT NULL | When GPS was captured |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When record was stored |

**Partition:** By `captured_at` (monthly partitions).

---

### customer_visits

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK, NOT NULL | Tenant |
| `user_id` | UUID | FK, NOT NULL | Employee who visited |
| `attendance_id` | UUID | FK, NULLABLE | Linked attendance session |
| `customer_id` | UUID | FK, NULLABLE | Existing customer reference |
| `customer_name` | VARCHAR(255) | NOT NULL | Customer name (denormalized) |
| `village` | VARCHAR(255) | NULLABLE | Village/area name |
| `latitude` | DECIMAL(10,7) | NOT NULL | Visit GPS lat |
| `longitude` | DECIMAL(10,7) | NOT NULL | Visit GPS lng |
| `selfie_url` | TEXT | NULLABLE | Selfie image URL |
| `notes` | TEXT | NULLABLE | Visit notes |
| `products_discussed` | TEXT | NULLABLE | Products discussed |
| `visit_duration_minutes` | INTEGER | NULLABLE | Duration of visit |
| `local_id` | UUID | UNIQUE | Offline sync idempotency |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft delete |

---

### product_sales

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK, NOT NULL | Tenant |
| `user_id` | UUID | FK, NOT NULL | Employee who recorded |
| `customer_id` | UUID | FK, NOT NULL | Customer |
| `attendance_id` | UUID | FK, NULLABLE | Linked attendance session |
| `total_amount` | DECIMAL(12,2) | NOT NULL | Total sale amount |
| `remarks` | TEXT | NULLABLE | Sale remarks |
| `local_id` | UUID | UNIQUE | Offline sync idempotency |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft delete |

### sale_items

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `sale_id` | UUID | FK → product_sales.id, NOT NULL | Parent sale |
| `product_id` | UUID | FK → products.id, NOT NULL | Product |
| `quantity` | DECIMAL(10,2) | NOT NULL | Quantity sold |
| `unit_price` | DECIMAL(10,2) | NOT NULL | Price per unit |
| `total_price` | DECIMAL(12,2) | NOT NULL | quantity × unit_price |

---

### inspections

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK, NOT NULL | Tenant |
| `user_id` | UUID | FK, NOT NULL | Employee |
| `attendance_id` | UUID | FK, NULLABLE | Linked attendance |
| `site_name` | VARCHAR(255) | NOT NULL | Farm/site name |
| `category` | VARCHAR(100) | NULLABLE | Inspection category |
| `crop` | VARCHAR(100) | NULLABLE | Crop type (if agricultural) |
| `observation` | TEXT | NOT NULL | Inspection observation |
| `recommendation` | TEXT | NULLABLE | Recommendation |
| `latitude` | DECIMAL(10,7) | NOT NULL | Inspection GPS lat |
| `longitude` | DECIMAL(10,7) | NOT NULL | Inspection GPS lng |
| `local_id` | UUID | UNIQUE | Offline sync idempotency |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft delete |

---

## 4. Relationships Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| Company → Users | 1:N | Company has many users |
| Company → Branches | 1:N | Company has many branches |
| Company → Departments | 1:N | Company has many departments |
| Company → Designations | 1:N | Company has many designations |
| Company → Customers | 1:N | Company has many customers |
| Company → Products | 1:N | Company has many products |
| User → Attendance Records | 1:N | Employee has many attendance records |
| User → GPS Tracks | 1:N | Employee has many GPS points |
| User → Customer Visits | 1:N | Employee makes many visits |
| User → Product Sales | 1:N | Employee records many sales |
| User → Inspections | 1:N | Employee performs many inspections |
| User → Users (manager) | 1:N | Manager has many subordinates |
| Attendance → GPS Tracks | 1:N | Attendance session has many GPS points |
| Customer Visit → Visit Images | 1:N | Visit has many images |
| Product Sale → Sale Items | 1:N | Sale has many line items |
| Inspection → Inspection Images | 1:N | Inspection has many images |
| Branch → Departments | 1:N | Branch has many departments (optional) |

---

## Future Considerations

- **Tasks table:** For task assignment module.
- **Leaves table:** For leave management module.
- **Expenses table:** For expense management module.
- **Geofences table:** For geofencing module.
- **Invoices table:** For billing module.
- **Tenant config tables:** For per-company feature flags and settings.
