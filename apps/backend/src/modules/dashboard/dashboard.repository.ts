import { prisma } from '../../shared/config/prisma';

export class DashboardRepository {
  /** Count employees who punched in today. */
  async countTodayAttendance(companyId: string, targetDate: Date): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.attendance.count({
      where: {
        companyId,
        punchInTime: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  /** Count active (non-deleted) employees in the company. */
  async countActiveEmployees(companyId: string): Promise<number> {
    return prisma.user.count({
      where: { companyId, deletedAt: null },
    });
  }

  /** Count visits logged today. */
  async countTodayVisits(companyId: string, targetDate: Date): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.visit.count({
      where: {
        companyId,
        deletedAt: null,
        checkInTime: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  /** Sum today's sales revenue. */
  async sumTodaySalesRevenue(companyId: string, targetDate: Date): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    return Number(result._sum.totalAmount ?? 0);
  }

  /** Count today's sales transactions. */
  async countTodaySales(companyId: string, targetDate: Date): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.sale.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  /** Count today's inspections. */
  async countTodayInspections(companyId: string, targetDate: Date): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.inspection.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  /** Attendance breakdown: present count, total working hours for a date range. */
  async getAttendanceBreakdown(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    const records = await prisma.attendance.findMany({
      where: {
        companyId,
        punchInTime: { gte: startDate, lte: endDate },
      },
      select: {
        userId: true,
        punchInTime: true,
        punchOutTime: true,
        workingHours: true,
      },
    });

    const uniqueEmployees = new Set(records.map((r) => r.userId)).size;
    const completedShifts = records.filter((r) => r.punchOutTime !== null).length;
    const totalHours = records.reduce(
      (sum, r) => sum + Number(r.workingHours ?? 0),
      0
    );

    return {
      totalRecords: records.length,
      uniqueEmployees,
      completedShifts,
      totalWorkingHours: Math.round(totalHours * 100) / 100,
    };
  }

  /** Top selling products within a date range. */
  async getTopProducts(
    companyId: string,
    startDate: Date,
    endDate: Date,
    limit = 5
  ) {
    const items = await prisma.saleItem.findMany({
      where: {
        sale: {
          companyId,
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        productId: true,
        quantity: true,
        totalPrice: true,
        product: { select: { name: true } },
      },
    });

    // Aggregate by product
    const map = new Map<string, { name: string; totalQty: number; totalRevenue: number }>();
    for (const item of items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.totalQty += item.quantity;
        existing.totalRevenue += Number(item.totalPrice);
      } else {
        map.set(item.productId, {
          name: item.product.name,
          totalQty: item.quantity,
          totalRevenue: Number(item.totalPrice),
        });
      }
    }

    return Array.from(map.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  /** Manager's team metrics for a given date. */
  async getTeamMetrics(companyId: string, managerId: string, targetDate: Date) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get team member IDs
    const teamMembers = await prisma.user.findMany({
      where: { companyId, managerId, deletedAt: null },
      select: { id: true, name: true },
    });

    const memberIds = teamMembers.map((m) => m.id);

    const [attendance, visits, sales] = await Promise.all([
      prisma.attendance.count({
        where: {
          companyId,
          userId: { in: memberIds },
          punchInTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.visit.count({
        where: {
          companyId,
          userId: { in: memberIds },
          deletedAt: null,
          checkInTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: true,
        where: {
          companyId,
          userId: { in: memberIds },
          deletedAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    return {
      teamSize: teamMembers.length,
      presentToday: attendance,
      visitsToday: visits,
      salesToday: sales._count,
      revenueToday: Number(sales._sum.totalAmount ?? 0),
    };
  }
}
