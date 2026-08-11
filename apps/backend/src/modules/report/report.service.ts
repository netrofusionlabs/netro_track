import { ReportRepository } from './report.repository';

export class ReportService {
  private reportRepo = new ReportRepository();

  async getAttendanceReport(
    companyId: string,
    startDateStr: string,
    endDateStr: string,
    userId?: string
  ) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.reportRepo.getAttendanceReport(
      companyId,
      startDate,
      endDate,
      userId
    );

    const totalHours = records.reduce(
      (sum, r) => sum + Number(r.workingHours ?? 0),
      0
    );

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalRecords: records.length,
      totalWorkingHours: Math.round(totalHours * 100) / 100,
      records: records.map((r) => ({
        id: r.id,
        employee: r.user,
        punchInTime: r.punchInTime.toISOString(),
        punchOutTime: r.punchOutTime?.toISOString() ?? null,
        workingHours: r.workingHours ? Number(r.workingHours) : null,
        punchInLocation: {
          latitude: Number(r.punchInLatitude),
          longitude: Number(r.punchInLongitude),
        },
        punchOutLocation: r.punchOutLatitude
          ? {
              latitude: Number(r.punchOutLatitude),
              longitude: Number(r.punchOutLongitude),
            }
          : null,
      })),
    };
  }

  async getVisitsReport(
    companyId: string,
    startDateStr: string,
    endDateStr: string,
    userId?: string,
    customerId?: string
  ) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.reportRepo.getVisitsReport(
      companyId,
      startDate,
      endDate,
      userId,
      customerId
    );

    const totalDuration = records.reduce(
      (sum, r) => sum + (r.duration ?? 0),
      0
    );

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalRecords: records.length,
      totalDurationMinutes: Math.round(totalDuration / 60),
      records: records.map((r) => ({
        id: r.id,
        employee: r.user,
        customer: r.customer,
        checkInTime: r.checkInTime.toISOString(),
        checkOutTime: r.checkOutTime?.toISOString() ?? null,
        durationMinutes: r.duration ? Math.round(r.duration / 60) : null,
        productsDiscussed: r.productsDiscussed,
        notes: r.notes,
        location: {
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        },
      })),
    };
  }

  async getSalesReport(
    companyId: string,
    startDateStr: string,
    endDateStr: string,
    userId?: string,
    customerId?: string
  ) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.reportRepo.getSalesReport(
      companyId,
      startDate,
      endDate,
      userId,
      customerId
    );

    const totalRevenue = records.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    );
    const totalItems = records.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalRecords: records.length,
      totalRevenue,
      totalItemsSold: totalItems,
      records: records.map((r) => ({
        id: r.id,
        employee: r.user,
        customer: r.customer,
        totalAmount: Number(r.totalAmount),
        remarks: r.remarks,
        createdAt: r.createdAt.toISOString(),
        items: r.items.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          price: Number(i.price),
          totalPrice: Number(i.totalPrice),
        })),
      })),
    };
  }
}
