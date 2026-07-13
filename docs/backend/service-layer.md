# Service Layer

> **Purpose:** Define how business logic is organized in the service layer.
> **Dependencies:** [Backend Overview](backend-overview.md)

---

## Responsibilities

Services contain **all business logic**. They orchestrate operations, enforce business rules, and coordinate between repositories.

| Do | Don't |
|----|-------|
| Validate business rules | Handle HTTP request/response |
| Call repositories for data access | Access Prisma directly |
| Call other services for cross-module logic | Know about Express (req, res) |
| Throw AppError for business violations | Return HTTP status codes |
| Coordinate transactions | Handle authentication |

---

## Pattern

```typescript
class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepository,
    private trackingService: TrackingService, // cross-module via DI
    private auditService: AuditService,
  ) {}

  async punchIn(userId: string, companyId: string, data: PunchInDTO) {
    // 1. Business rule: check if already punched in today
    const existing = await this.attendanceRepo.findTodayByUser(companyId, userId);
    if (existing) {
      throw new AppError('ATTENDANCE_EXISTS', 'Already punched in today', 409);
    }

    // 2. Create attendance record
    const attendance = await this.attendanceRepo.create({
      companyId, userId, ...data
    });

    // 3. Cross-module: start tracking
    await this.trackingService.startTracking(userId, attendance.id);

    // 4. Audit
    await this.auditService.log({
      companyId, userId, action: 'PUNCH_IN',
      entityType: 'Attendance', entityId: attendance.id,
    });

    return attendance;
  }
}
```

---

## Service Catalog

| Service | Responsibility |
|---------|---------------|
| AuthService | Login, token management, MPIN, device registration |
| CompanyService | Company CRUD, suspension, activation |
| EmployeeService | Employee CRUD, bulk import, manager assignment |
| AttendanceService | Punch in/out, working hours, attendance queries |
| TrackingService | GPS batch processing, route queries, distance calculation |
| VisitService | Visit creation, visit queries |
| SaleService | Sale creation, sale queries |
| InspectionService | Inspection creation, queries |
| ReportService | Report generation, aggregation |
| NotificationService | FCM sending, notification management |
| UploadService | Signed URL generation |
| DashboardService | Dashboard data aggregation |
| AuditService | Audit log writing |
| SettingsService | Company settings management |
