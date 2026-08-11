import { prisma } from '../../shared/config/prisma';

export class ReportRepository {
  /** Attendance records within a date range, optionally filtered by userId. */
  async getAttendanceReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
    userId?: string
  ) {
    return prisma.attendance.findMany({
      where: {
        companyId,
        punchInTime: { gte: startDate, lte: endDate },
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { punchInTime: 'desc' },
    });
  }

  /** Visits within a date range, optionally filtered by userId and customerId. */
  async getVisitsReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
    customerId?: string
  ) {
    return prisma.visit.findMany({
      where: {
        companyId,
        deletedAt: null,
        checkInTime: { gte: startDate, lte: endDate },
        ...(userId ? { userId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        customer: { select: { id: true, name: true, type: true } },
      },
      orderBy: { checkInTime: 'desc' },
    });
  }

  /** Sales within a date range, optionally filtered by userId and customerId. */
  async getSalesReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
    customerId?: string
  ) {
    return prisma.sale.findMany({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
        ...(userId ? { userId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
