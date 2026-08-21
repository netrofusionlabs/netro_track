# Attendance Regularization

Attendance Regularization allows employees to request corrections to their attendance logs for past dates, or regularize missed punches, under policy-defined conditions. Managers review and approve/reject these requests.

---

## 1. Feature Specifications

### 1.1 Policy-Driven Configuration
Every user is subject to an effective `AttendancePolicy` that defines the constraints for regularization:
- **`allowRegularization`**: Master switch to enable/disable regularization requests.
- **`allowMissedPunch`**: Toggle allowing punch request creation for dates with zero logged attendance.
- **`allowTimeCorrection`**: Toggle allowing employees to adjust existing completed punch-in/out times.
- **`maxRequestsPerMonth`**: Rolling monthly request count limit.
- **`regularizationWindowDays`**: Window in days specifying how far back in the past a regularization can target.

### 1.2 Image Upload Exemption & Split Odometer Readings
- To lower barriers and accommodate back-dated requests, regularization requests **do not require image evidence** (selfies, vehicle photos, etc.).
- Vehicle odometer inputs are independently mapped to Punch In and Punch Out based on the policy requirements for each punch action:
  - If `punchInConfig.vehicleMeter === 'REQUIRED'`, a manual input for **Punch In Odometer** is prompted when regularizing Punch In.
  - If `punchOutConfig.vehicleMeter === 'REQUIRED'`, a manual input for **Punch Out Odometer** is prompted when regularizing Punch Out.

### 1.3 Audit Log Preservation
- Regularization does not overwrite history without maintaining records.
- The `AttendanceRegularization` database table maintains:
  - `originalPunchIn` / `originalPunchOut`
  - `requestedPunchIn` / `requestedPunchOut`
  - `originalPunchInOdometer` / `originalPunchOutOdometer`
  - `requestedPunchInOdometer` / `requestedPunchOutOdometer`
  - Status, Approver ID, Remarks, and updated timestamps.
- Approved requests update the active `Attendance` record times while preserving the request audit trail permanently.

### 1.4 Navigation Entry Points
- **Quick Actions Grid:** Located on the Home Dashboard, allowing users to select any target date manually.
- **Attendance History Logs:** A **Regularize** shortcut button is rendered on each daily log card. Tapping it navigates to the request screen with the date parameter prefilled automatically.

---

## 2. API Endpoints

### 2.1 Submit Regularization Request
- **Route:** `POST /api/v1/attendance/regularization`
- **Authentication:** Bearer JWT Token
- **Request Body:**
  ```json
  {
    "date": "2026-08-18",
    "requestedPunchIn": "2026-08-18T09:00:00.000Z",
    "requestedPunchOut": "2026-08-18T18:00:00.000Z",
    "requestedPunchInOdometer": 45290,
    "requestedPunchOutOdometer": 45310,
    "reason": "Forgot to punch in during client onboarding."
  }
  ```

### 2.2 List Regularizations
- **Route:** `GET /api/v1/attendance/regularization?status=PENDING`
- **Access Control:** Role-restricted
  - `EMPLOYEE`: Returns own regularization requests.
  - `MANAGER`: Returns subordinate team requests.
  - `HR`, `COMPANY_ADMIN`: Returns all company requests.

### 2.3 Single Review Approval/Rejection
- **Route:** `POST /api/v1/attendance/regularization/:id/review`
- **Request Body:**
  ```json
  {
    "action": "APPROVED",
    "remarks": "Approved after calendar verification."
  }
  ```

### 2.4 Bulk Approval Review
- **Route:** `POST /api/v1/attendance/regularization/bulk-review`
- **Request Body:**
  ```json
  {
    "ids": ["uuid-1", "uuid-2"],
    "action": "APPROVED",
    "remarks": "Batch approved by supervisor."
  }
  ```

---

## 3. Organizational Validation Rules

1. **Future Dates:** Regularization request dates cannot target future dates.
2. **Conflict Overlap:** Employees cannot submit duplicate pending requests for the same date.
3. **Hierarchy Scoping:** Managers are restricted to review requests belonging only to their immediate team hierarchy subordinates.
4. **Tenant Isolation:** All routes extract `companyId` from JWT payloads. Cross-tenant database queries or approvals are strictly prohibited.
