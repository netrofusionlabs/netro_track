# Business Rules

> **Purpose:** Catalog all business rules that govern NetroTrack's behavior.
> **Scope:** Data rules, process rules, validation rules, access rules.
> **Dependencies:** [User Roles](user-roles.md), [User Workflows](user-workflows.md)

---

## 1. Tenant Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-T01 | Every employee belongs to exactly one company | Database constraint: `company_id NOT NULL` |
| BR-T02 | Every manager belongs to exactly one company | Database constraint |
| BR-T03 | A company cannot access another company's data | Middleware: `tenantMiddleware` filters all queries by `companyId` from JWT |
| BR-T04 | `companyId` must never be accepted from request body for data access | Derived exclusively from authenticated user's JWT |
| BR-T05 | Suspended companies cannot have any user log in | Auth middleware checks company status |
| BR-T06 | Deleting a company soft-deletes all associated data | Cascading soft delete |

---

## 2. Authentication Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-A01 | Only one active session per user at any time | Token invalidation on new login |
| BR-A02 | One registered device per user (default) | Device fingerprint check on login |
| BR-A03 | MPIN must be 4–6 digits | Zod validation on API |
| BR-A04 | MPIN must be hashed — never stored as plaintext | Argon2 hashing |
| BR-A05 | 5 consecutive failed MPIN attempts lock the account for 30 minutes | Rate counter in Redis |
| BR-A06 | First login requires full credentials (Employee ID + Password) | Cannot create MPIN without initial authentication |
| BR-A07 | Device change requires full re-authentication | Previous device token invalidated |
| BR-A08 | Biometric authentication is optional — MPIN is always available | Fallback mechanism |
| BR-A09 | Password reset can only be initiated by Client Admin or Super Admin | Employee cannot self-reset password |
| BR-A10 | MPIN reset can be initiated by the employee (with password) or by admin | Two paths to reset |
| BR-A11 | JWT access token expires after 15 minutes | Short-lived tokens |
| BR-A12 | JWT refresh token expires after 7 days and is single-use | Rotation on each refresh |

---

## 3. Attendance Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-AT01 | Attendance begins only after Punch In | No working hours counted without explicit punch-in |
| BR-AT02 | An employee can only have one active attendance record per day | Database unique constraint on (employee_id, date) |
| BR-AT03 | Punch In requires GPS coordinates | Validation: latitude and longitude required |
| BR-AT04 | Punch Out requires GPS coordinates | Validation |
| BR-AT05 | Working hours = Punch Out time − Punch In time | Calculated server-side |
| BR-AT06 | Late Login: Punch In after company-defined start time | Configurable per company (future) |
| BR-AT07 | Early Logout: Punch Out before company-defined end time | Configurable per company (future) |
| BR-AT08 | Attendance works offline — queued and synced when connectivity returns | MMKV queue |
| BR-AT09 | Attendance cannot be edited by the employee after submission | Only admin can modify (audit-logged) |
| BR-AT10 | Duplicate punch-in on the same day is rejected | Server-side validation |

---

## 4. GPS Tracking Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-G01 | GPS tracking starts automatically after Punch In | Triggered by punch-in event |
| BR-G02 | GPS tracking stops immediately after Punch Out | Triggered by punch-out event |
| BR-G03 | GPS must continue tracking when screen is locked | Background service |
| BR-G04 | GPS must continue tracking when user switches apps | Background service |
| BR-G05 | GPS capture interval: every 30 seconds | Background timer |
| BR-G06 | GPS batch sync interval: every 2.5–5 minutes | Buffer 5–10 points, then send |
| BR-G07 | Each GPS record must include: lat, lng, accuracy, speed, heading, timestamp, battery %, network type, GPS provider | Validation schema |
| BR-G08 | GPS points with accuracy > 100m should be flagged | Quality indicator stored with point |
| BR-G09 | GPS data belongs to the employee's company | `companyId` on every record |
| BR-G10 | Offline GPS points are queued and synced automatically | MMKV queue with auto-sync |
| BR-G11 | GPS points must be deduplicated on sync (idempotent) | Local UUID per point |

---

## 5. Customer Visit Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-V01 | Every visit requires GPS coordinates | Validation: lat/lng required |
| BR-V02 | Every visit must include a timestamp | Auto-captured, server-validated |
| BR-V03 | Visits require employee to be punched in | Server validates active attendance |
| BR-V04 | Customer name is required | Validation |
| BR-V05 | Selfie is recommended (configurable per company — future) | Optional by default |
| BR-V06 | Images should be optional or mandatory based on company settings (future) | Feature flag |
| BR-V07 | Visit duration is calculated from check-in to submission | Server-side calculation |
| BR-V08 | Visits work offline and sync when connectivity returns | MMKV queue |
| BR-V09 | Submitted visits cannot be edited by the employee | Immutable after submission |
| BR-V10 | Visits are visible to the employee, their manager, and their company admin | Role-based access |

---

## 6. Product Sales Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-S01 | Sales require a customer | Validation: customer_id required |
| BR-S02 | Sales require at least one product | Validation |
| BR-S03 | Quantity must be a positive number | Validation: quantity > 0 |
| BR-S04 | Price must be a non-negative number | Validation: price >= 0 |
| BR-S05 | Sales require employee to be punched in | Server validation |
| BR-S06 | Sales work offline and sync when connectivity returns | MMKV queue |
| BR-S07 | Sales records are immutable after submission | No edit/delete by employee |

---

## 7. Inspection Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-I01 | Inspection requires GPS coordinates | Validation |
| BR-I02 | Inspection requires a site/farm identifier | Validation |
| BR-I03 | Observation field is required | Validation |
| BR-I04 | Photos are optional (configurable per company — future) | Feature flag |
| BR-I05 | Inspection requires employee to be punched in | Server validation |
| BR-I06 | Inspections work offline and sync when connectivity returns | MMKV queue |
| BR-I07 | Inspections are immutable after submission | No edit/delete by employee |

---

## 8. Image Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-IM01 | Images must not pass through the API as large payloads | Direct upload to R2 via signed URL |
| BR-IM02 | Only image URLs are stored in the database | Never blob storage in PostgreSQL |
| BR-IM03 | Maximum image size: 2MB after compression | Client-side compression before upload |
| BR-IM04 | Image format: JPEG at 80% quality | Client-side conversion |
| BR-IM05 | Maximum dimension: 1920px (longest edge) | Client-side resize |
| BR-IM06 | Signed URLs for upload have a 15-minute expiry | Server-generated with TTL |
| BR-IM07 | Each image belongs to a company | Path includes company identifier |

---

## 9. Report Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-R01 | Employees see only their own reports | Role-based query filter |
| BR-R02 | Managers see only their assigned team's reports | Team-filtered query |
| BR-R03 | Client Admins see all company reports | Company-filtered query |
| BR-R04 | Super Admins see platform-wide reports | No filter (or global) |
| BR-R05 | Reports must support date range filtering | API parameter |
| BR-R06 | Future: Reports should be exportable as CSV/PDF | Planned feature |

---

## 10. Notification Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-N01 | Notifications are delivered via Firebase Cloud Messaging | FCM integration |
| BR-N02 | Attendance reminders are sent at configurable times | Background job |
| BR-N03 | Notifications belong to a company | Scoped delivery |
| BR-N04 | Users can receive notifications when the app is closed | FCM handles background delivery |
| BR-N05 | Future: Geofence alerts, low battery alerts, offline alerts | Planned features |

---

## 11. Data Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-D01 | Every major action must be recorded in an audit log | Audit middleware |
| BR-D02 | All timestamps stored in UTC | Database convention |
| BR-D03 | All timestamps displayed in company/user timezone | Client-side conversion |
| BR-D04 | Business data is never hard-deleted | Soft delete with `deleted_at` |
| BR-D05 | UUIDs for all primary keys | Database schema |
| BR-D06 | Every business table includes `company_id` | Schema constraint |
| BR-D07 | Every table includes `created_at` and `updated_at` | Schema default |
| BR-D08 | GPS data retained for 90 days (hot), 1 year (aggregated) | Data retention policy |

---

## 12. Sync Rules (Offline)

| # | Rule | Enforcement |
|---|------|------------|
| BR-SY01 | Offline actions sync automatically when connectivity returns | Sync engine |
| BR-SY06 | Sync queue persists across app restarts | MMKV persistence |

---

## 11. User Profile & Employment History Rules

| # | Rule | Enforcement |
|---|------|------------|
| BR-U01 | `name`, `employeeId`, `email` (Work Email), `phone` (Primary Mobile), `emergencyContactName`, `emergencyContactPhone`, and `designationName` are strictly mandatory when creating a user | Validation schema & DB constraint |
| BR-U02 | All mobile contact numbers (`phone`, `secondaryPhone`, `emergencyContactPhone`) MUST specify an international country code prefix (e.g. 🇮🇳 `+91`, 🇺🇸 `+1`) | `PhoneInput` component & validation schema |
| BR-U03 | System Access Role (`role`) is strictly separated from Designation / Job Title (`designationName`) | Service & database separation |
| BR-U04 | Users CANNOT alter their own Access Role via API (`403 FORBIDDEN_SELF_ROLE_EDIT`) | Server-side authorization check |
| BR-U05 | Access Role modifications require actor rank >= 2 (HR Executive or Admin) | Server-side authorization check |
| BR-U06 | Changing a user's Designation can be flagged as `isPromotion` to log an official career advancement on their timeline | User management service & UI toggle |
| BR-U07 | User onboarding, designation changes, promotions, access role updates, and manager reassignments MUST create atomic timeline events in `user_timeline_events` | `prisma.$transaction` engine |
| BR-U08 | Professional timeline audit logs are append-only and immutable — no user or admin can update or delete timeline events | Read-only API surface |
| BR-U09 | Generic personal edits (phone, blood group, links) do NOT clutter the professional timeline; only HR milestones generate events | Timeline filter logic |
| BR-U10 | Form UI must present a single, deduplicated Designation / Job Title field | Single input UI pattern |

---

## Future Considerations

- Company-configurable business rules (e.g., mandatory selfie, working hours, late policy).
- Geofence rules (auto punch-in when entering office perimeter).
- Approval workflows (visit approval, expense approval).
- SLA-based rules (visit frequency per customer).
- Automated alerts based on rule violations.

---

## Best Practices

- Every business rule must have a unique identifier (BR-XXX) for traceability.
- Business rules must be enforced server-side — client-side validation is for UX only.
- Log all business rule violations for auditing.
- When rules conflict, the server is authoritative.
- Review business rules quarterly as the product evolves.
