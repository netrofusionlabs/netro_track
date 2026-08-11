import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  private dashboardRepo = new DashboardRepository();

  /** Company-wide today summary. */
  async getSummary(companyId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    const [
      totalEmployees,
      presentToday,
      visitsToday,
      salesCount,
      revenue,
      inspections,
    ] = await Promise.all([
      this.dashboardRepo.countActiveEmployees(companyId),
      this.dashboardRepo.countTodayAttendance(companyId, targetDate),
      this.dashboardRepo.countTodayVisits(companyId, targetDate),
      this.dashboardRepo.countTodaySales(companyId, targetDate),
      this.dashboardRepo.sumTodaySalesRevenue(companyId, targetDate),
      this.dashboardRepo.countTodayInspections(companyId, targetDate),
    ]);

    const absentToday = Math.max(0, totalEmployees - presentToday);

    return {
      date: targetDate.toISOString().split('T')[0],
      totalEmployees,
      presentToday,
      absentToday,
      attendanceRate: totalEmployees > 0
        ? Math.round((presentToday / totalEmployees) * 100)
        : 0,
      visitsToday,
      salesCount,
      revenue,
      inspections,
    };
  }

  /** Attendance breakdown for a date range. */
  async getAttendanceSummary(
    companyId: string,
    startDateStr: string,
    endDateStr: string
  ) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const totalEmployees = await this.dashboardRepo.countActiveEmployees(companyId);
    const breakdown = await this.dashboardRepo.getAttendanceBreakdown(
      companyId,
      startDate,
      endDate
    );

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalEmployees,
      ...breakdown,
    };
  }

  /** Sales summary with top products. */
  async getSalesSummary(
    companyId: string,
    startDateStr?: string,
    endDateStr?: string
  ) {
    const now = new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = endDateStr ? new Date(endDateStr) : now;
    endDate.setHours(23, 59, 59, 999);

    const [revenue, salesCount, topProducts] = await Promise.all([
      this.dashboardRepo.sumTodaySalesRevenue(companyId, endDate),
      this.dashboardRepo.countTodaySales(companyId, endDate),
      this.dashboardRepo.getTopProducts(companyId, startDate, endDate),
    ]);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalRevenue: revenue,
      totalTransactions: salesCount,
      topProducts,
    };
  }

  /** Manager-scoped team summary. */
  async getTeamSummary(companyId: string, managerId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardRepo.getTeamMetrics(companyId, managerId, targetDate);
  }
}
