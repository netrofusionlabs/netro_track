# Feature Specifications

> **Purpose:** Detailed specifications for all core features.
> **Dependencies:** [Business Rules](../product/business-rules.md), [User Workflows](../product/user-workflows.md)

---

## Feature Catalog

### 1. Authentication & Security
- Login with Employee ID + Password
- MPIN setup and daily login (4-6 digit)
- Biometric authentication (fingerprint/face)
- Device binding (1 user = 1 device)
- MPIN lockout (5 failed attempts = 30 min lock)
- Session management (15 min access token, 7-day refresh)

### 2. Attendance Management
- GPS-verified punch in/out
- Real-time working hours timer
- Automatic GPS tracking on punch in
- Auto punch out at midnight (configurable)
- Daily attendance history with calendar view
- Monthly attendance summary
- Late detection based on company settings

### 3. GPS Tracking
- Background location tracking (30s intervals)
- Batch sync (5-10 points every 2.5-5 min)
- Route visualization on map
- Route playback with timeline slider
- Distance calculation (Haversine)
- Adaptive tracking (motion-based intervals)
- Battery and network metadata capture

### 4. Customer Visits
- GPS auto-capture at visit location
- Selfie photo (optional/configurable)
- Customer selection from list or new customer
- Products discussed (text field)
- Visit notes
- Duration tracking
- Visit images gallery

### 5. Product Sales
- Customer selection
- Product selection from catalog (multi-select)
- Quantity and price per item
- Automatic total calculation
- Remarks field
- Sale receipt/summary

### 6. Field Inspections
- Site name and category
- GPS auto-capture
- Observation text (required)
- Recommendation text
- Photo gallery (multiple photos)
- Crop/category type (for agriculture)

### 7. Dashboard
- Role-specific dashboards (User, Manager, Admin, Super Admin)
- Today's stats: attendance, visits, sales, inspections, distance
- Quick action buttons
- Team status (Manager): present/absent/working counts
- Company overview (Admin): total employees, active today, metrics

### 8. Reports
- Attendance reports (daily, weekly, monthly)
- Visit reports
- Sales reports
- Inspection reports
- Distance/productivity reports
- Date range filtering
- CSV export (future: PDF)

### 9. Employee Management (Admin)
- Employee CRUD
- Branch, department, designation assignment
- Manager assignment (hierarchy)
- Status management (active/suspended)
- Bulk import via CSV (future)
- Password/MPIN reset

### 10. Company Management (Super Admin)
- Company CRUD
- Company suspension/activation
- Create client admin for each company
- Company usage statistics
- Platform-wide analytics

### 11. Attendance Regularization
- Policy-driven request workflow allowing employees to correct past dates.
- Support for correcting existing completed punches or regularizing missed days.
- Validation checks enforcing window limit (days) and monthly limit thresholds.
- Odometer/meter logging without image upload requirements (manual text/number input).
- Organizational manager reporting hierarchy integration for approval routes.
- Single and bulk manager review interfaces with comments and remarks.
- Immutable audit log preserving original recorded times.
