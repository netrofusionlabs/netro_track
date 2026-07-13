# Repository Layer

> **Purpose:** Define data access patterns using Prisma.
> **Dependencies:** [Service Layer](service-layer.md), [Database Overview](../database/database-overview.md)

---

## Responsibilities

Repositories are the **only layer** that interacts with Prisma/database.

| Do | Don't |
|----|-------|
| Execute Prisma queries | Contain business logic |
| Map database records to DTOs | Validate business rules |
| Handle query-level concerns (pagination, filtering) | Know about HTTP or services |
| Encapsulate raw SQL when needed | Throw business-level errors |

---

## Pattern

```typescript
class AttendanceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAttendanceData) {
    return this.prisma.attendanceRecord.create({ data });
  }

  async findTodayByUser(companyId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.prisma.attendanceRecord.findFirst({
      where: { companyId, userId, date: today, deletedAt: null },
    });
  }

  async findByDateRange(companyId: string, params: DateRangeParams) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        companyId,
        date: { gte: params.startDate, lte: params.endDate },
        deletedAt: null,
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }
}
```

---

## Key Rules

1. **Always include `companyId`** in WHERE clauses for tenant isolation.
2. **Always exclude soft-deleted records** (`deletedAt: null`) unless explicitly querying deleted data.
3. **Use `select`** to limit returned fields for performance.
4. **Use `skipDuplicates`** for batch inserts (idempotent GPS sync).
5. **Use transactions** for operations that modify multiple tables.
6. **Fall back to raw SQL** only for complex aggregations or performance-critical queries.
