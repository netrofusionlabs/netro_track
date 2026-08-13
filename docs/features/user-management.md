# User Management & Professional Timeline Engine Specification

> **Purpose:** Detailed functional & technical specification for User Management, Access Roles, Designation Titles, Mandatory Contact Validation, and the Professional Timeline Engine.
> **Dependencies:** [User Roles](../product/user-roles.md), [Business Rules](../product/business-rules.md), [Audit Strategy](../database/audit-strategy.md)

---

## 1. Overview & Architecture

User Management in NetroTrack provides enterprise-grade access control and workforce record management across multi-tenant organizations.

### Key Architectural Concepts
1. **Access Role vs. Designation**: System security roles (`UserRole` enum) govern platform permissions, while `Designation` stores the employee's official HR title.
2. **Transactional Audit Logging**: User mutations and timeline event creations execute inside atomic PostgreSQL transactions (`prisma.$transaction`).
3. **Mandatory Profile Controls**: Critical contact and organizational details are required on user creation.
4. **International Country Code Selector**: Mobile contact inputs standardize on international phone formatting with an interactive country code picker (`PhoneInput`).

---

## 2. User Creation & Updating Controls

### Mandatory Fields Matrix

| Field | Input Type | Validation Rules |
|-------|------------|------------------|
| **Employee ID / Login Code** | Text | Required, non-empty, unique per company |
| **Full Name** | Text | Required, min 2 characters |
| **Designation / Job Title** | Text + Presets | Required, non-empty string |
| **Official Work Email** | Email | Required, valid email format |
| **Primary Mobile Number** | Phone + Country Code | Required, international format (e.g. `+91 9876543210`) |
| **Emergency Contact Person Name** | Text | Required, non-empty string |
| **Emergency Contact Phone Number** | Phone + Country Code | Required, international format (e.g. `+91 9123456789`) |
| **System Access Role** | Role Picker | Required, restricted by actor rank |
| **Personal Email** | Email | Optional |
| **Secondary Mobile Number** | Phone + Country Code | Optional |
| **Blood Group** | Chip Picker / Text | Optional |
| **Password** | Secret | Optional on creation (defaults to `Password123!`) |
| **Reporting Supervisor** | Search Dropdown | Required for Employee, Manager, and HR roles |

---

## 3. International Phone Country Code Component (`PhoneInput`)

All mobile contact inputs utilize the `<PhoneInput />` component providing:
- **Left Dropdown**: Flag icon + country code picker button (defaults to 🇮🇳 `+91`).
- **Modal Selector**: Supports 🇮🇳 `+91`, 🇺🇸 `+1`, 🇬🇧 `+44`, 🇦🇪 `+971`, 🇸🇬 `+65`, 🇦🇺 `+61`, 🇩🇪 `+49`, 🇸🇦 `+966`, 🇴🇲 `+968`, 🇶🇦 `+974`, 🇲🇾 `+60`.
- **Text Input**: 10-digit number input with automatic formatting and sanitization.

---

## 4. Professional Timeline Audit Engine

### Specification
Every employee profile includes a dedicated **Professional Timeline** rendering an immutable chronological audit trail of organizational events.

### Event Types (`TimelineEventType`)
- `ONBOARDING`: Initial employee creation.
- `DESIGNATION_ASSIGNED`: Initial job title assignment.
- `DESIGNATION_CHANGED`: Standard job title update.
- `PROMOTION`: Official career promotion (triggered via `isPromotion` UI toggle).
- `ACCESS_ROLE_ASSIGNED`: Initial permission role assignment.
- `ACCESS_ROLE_CHANGED`: Security permission tier change.
- `MANAGER_ASSIGNED`: Initial supervisor assignment.
- `MANAGER_CHANGED`: Supervisor reassignment.
- `EMPLOYMENT_TYPE_CHANGED`: Work contract status change.
- `LOCATION_CHANGED`: Branch location transfer.
- `DEPARTMENT_CHANGED`: Department transfer.
- `COMPANY_CHANGED`: Corporate tenant migration.

---

## 5. Security & Authorization Rules

1. **Self-Role Modification Lock**: Users CANNOT edit their own `role` field via `PUT /api/v1/users/:id`. The server returns HTTP `403 FORBIDDEN_SELF_ROLE_EDIT`.
2. **HR Authorization Rank**: Only users with Access Role rank >= 2 (`HR`, `COMPANY_ADMIN`, `SUPER_ADMIN`, `MASTER_SUPER_ADMIN`) can edit another user's Access Role or Designation.
3. **Timeline Immutability**: No `PUT` or `DELETE` endpoints exist for `UserTimelineEvent` records.
