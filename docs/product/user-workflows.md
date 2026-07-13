# User Workflows

> **Purpose:** Document the daily workflows for each user role.
> **Scope:** Step-by-step workflows, decision points, state transitions.
> **Dependencies:** [User Roles](user-roles.md), [Product Philosophy](product-philosophy.md)

---

## 1. Client User — Daily Workflow

The typical workday for a field employee:

### Morning Routine

```
1. Employee opens the app
       │
2. Authenticates via MPIN or Biometric
       │
3. Views Dashboard
       │
       ├── Attendance status
       ├── Today's summary (visits, sales, distance)
       └── Notifications
       │
4. Taps "Punch In"
       │
       ├── Attendance record created
       ├── GPS tracking starts automatically
       ├── Working hours timer starts
       └── Live status → "Working"
```

### Field Work

```
5. Employee travels to customer location
       │
       ├── GPS tracking continues in background
       ├── Location recorded every 30 seconds
       └── Works even when app is in background
       │
6. Reaches customer → Taps "+"
       │
       ├── New Visit
       │     ├── Select/enter customer name
       │     ├── GPS auto-captured
       │     ├── Take selfie
       │     ├── Take customer/product photos
       │     ├── Add notes
       │     └── Submit
       │
       ├── New Sale (if applicable)
       │     ├── Select customer
       │     ├── Select product
       │     ├── Enter quantity and price
       │     ├── Add remarks
       │     └── Submit
       │
       └── New Inspection (if applicable)
             ├── Enter farm/site
             ├── Select category
             ├── Add observation
             ├── Add recommendation
             ├── Take photos
             ├── GPS auto-captured
             └── Submit
```

### End of Day

```
7. Employee reviews daily activity
       │
       ├── Visit count
       ├── Sales summary
       ├── Distance traveled
       └── Working hours
       │
8. Taps "Punch Out"
       │
       ├── Attendance finalized
       ├── GPS tracking stops
       ├── Working hours calculated
       └── Live status → "Offline"
```

### Offline Scenario

```
If connectivity is lost at any point:
       │
       ├── Attendance: Works — saved locally
       ├── GPS: Works — queued in MMKV
       ├── Visits: Works — saved locally
       ├── Sales: Works — saved locally
       └── Inspections: Works — saved locally
       │
When connectivity returns:
       │
       └── Automatic sync — no user action required
```

---

## 2. Client Manager — Daily Workflow

### Morning

```
1. Manager opens app
       │
2. Authenticates via MPIN or Biometric
       │
3. Views Manager Dashboard
       │
       ├── Employees Working: X
       ├── Employees Offline: Y
       ├── Present today: X
       ├── Absent today: Y
       ├── Today's visits: N
       └── Today's sales: $$$
```

### During the Day

```
4. Checks live team status
       │
       ├── Team tab → List of assigned employees
       │     ├── Status (Working / Offline)
       │     ├── Last seen time
       │     ├── Battery %
       │     └── Current location
       │
       ├── Map tab → Team locations on map
       │     ├── Color-coded markers
       │     ├── Tap marker → Employee details
       │     └── Real-time position updates (Socket.IO)
       │
5. Reviews employee activity
       │
       ├── Tap employee → Employee detail
       │     ├── Today's route (polyline on map)
       │     ├── Visit log
       │     ├── Sales log
       │     ├── Attendance times
       │     └── Distance traveled
       │
6. Generates reports
       │
       ├── Reports tab
       │     ├── Team attendance report
       │     ├── Team visit report
       │     ├── Team sales report
       │     ├── Productivity report
       │     └── Date range filter
```

---

## 3. Client Admin — Workflow

### Employee Management

```
1. Admin opens app → Dashboard
       │
2. Employees tab
       │
       ├── View all company employees
       │     ├── Filter by department, branch, status
       │     └── Search by name or employee ID
       │
       ├── Create Employee
       │     ├── Personal details
       │     ├── Assign to branch / department
       │     ├── Assign designation
       │     ├── Assign to manager
       │     └── Set initial credentials
       │
       ├── Edit Employee
       │     ├── Update details
       │     ├── Change manager assignment
       │     ├── Change department/branch
       │     └── Suspend / reactivate
       │
       └── Reset Employee MPIN
```

### Company Configuration

```
3. Company tab
       │
       ├── Company Profile
       │     ├── Company name, logo
       │     └── Contact information
       │
       ├── Branches
       │     ├── Create / edit / deactivate branches
       │     └── Assign location to branch
       │
       ├── Departments
       │     ├── Create / edit / deactivate departments
       │     └── Assign to branch (optional)
       │
       └── Designations
             ├── Create / edit / deactivate designations
             └── Used for employee categorization
```

### Reports

```
4. Reports tab
       │
       ├── Company attendance summary
       ├── Employee working hours
       ├── Visit summary
       ├── Sales summary
       ├── Employee performance
       └── Date range filter
```

---

## 4. Super Admin — Workflow

### Company Management

```
1. Super Admin opens app → Platform Dashboard
       │
       ├── Total Companies: N
       ├── Total Employees: N
       ├── Active Companies: N
       ├── Active Users: N
       ├── Platform Health: OK
       └── Subscription Summary
       │
2. Companies tab
       │
       ├── View all companies
       │     ├── Filter by status (active, suspended)
       │     └── Search by name
       │
       ├── Onboard New Company
       │     ├── Company details
       │     ├── Subscription plan
       │     ├── Create Client Admin account
       │     └── Initial configuration
       │
       ├── Edit Company
       │     ├── Update details
       │     ├── Change subscription
       │     └── Suspend / activate
       │
       └── Company Detail
             ├── Employee count
             ├── Usage metrics
             ├── Subscription status
             └── Activity summary
```

### User Management

```
3. Users tab
       │
       ├── View all users across platform
       │     ├── Filter by company, role, status
       │     └── Search by name or ID
       │
       ├── Create user in any company
       └── Edit user in any company
```

### Platform Reports

```
4. Reports tab
       │
       ├── Platform analytics
       ├── Company usage comparison
       ├── Growth metrics
       └── Subscription metrics
```

---

## 5. First-Time User Flow (Onboarding)

```
1. Employee receives credentials (Employee ID + Password)
       │
2. Opens app → Login screen
       │
3. Enters Employee ID + Password
       │
4. Device Registration
       │     ├── Device fingerprint captured
       │     ├── Device bound to user account
       │     └── Only one device allowed (default)
       │
5. Create MPIN
       │     ├── 4-6 digit MPIN
       │     ├── Confirm MPIN
       │     └── MPIN hashed and stored
       │
6. Enable Biometrics (optional)
       │     ├── Fingerprint or Face ID prompt
       │     └── Biometric credential stored securely
       │
7. Lands on Dashboard
       │
       └── Ready for daily use
```

---

## 6. Session Management

| Scenario | Behavior |
|----------|----------|
| Normal login | MPIN → Dashboard (< 2 seconds) |
| Biometric login | Touch/Face → Dashboard (< 1 second) |
| Token expired | Silent refresh via refresh token |
| Refresh token expired | Redirect to MPIN/login screen |
| Device changed | Must log in with full credentials, device re-registered |
| Account suspended | Show suspension message, prevent login |
| Force logout (admin action) | Token invalidated, user redirected to login |

---

## Future Considerations

- Task assignment workflow (manager assigns tasks to employees).
- Leave request and approval workflow.
- Expense submission and approval workflow.
- Route planning and suggested visit order.
- Geofence-triggered actions (auto punch-in at office, alerts).
- Bulk operations for admins (bulk import, bulk reassign).

---

## Best Practices

- Design each workflow as a state machine with clear transitions.
- Every workflow should have an offline fallback path.
- Minimize required steps — each extra tap reduces adoption.
- Show progress indicators for multi-step workflows.
- Log every workflow completion for analytics.
