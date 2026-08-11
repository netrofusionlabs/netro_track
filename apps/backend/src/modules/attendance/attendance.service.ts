/**
 * AttendanceService — business logic for punch-in / punch-out / history.
 *
 * After every punch-in or punch-out, emits `employee:status` via Socket.IO
 * so managers see real-time presence changes on their dashboard.
 */
import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../shared/errors/AppError';
import { Attendance } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';
import { broadcastEmployeeStatus } from '../../shared/config/socket';

export class AttendanceService {
  private attendanceRepository = new AttendanceRepository();

  public async getActivePunch(companyId: string, userId: string): Promise<Attendance | null> {
    return this.attendanceRepository.findActivePunch(companyId, userId);
  }

  public async punchIn(
    companyId: string,
    userId: string,
    data: { latitude: number; longitude: number }
  ): Promise<Attendance> {
    // 1. Guard: no active (un-closed) punch
    const active = await this.attendanceRepository.findActivePunch(companyId, userId);
    if (active) {
      throw new AppError('ALREADY_PUNCHED_IN', 'You are already punched in', 400);
    }

    const record = await this.attendanceRepository.createPunchIn({
      companyId,
      userId,
      punchInTime: new Date(),
      punchInLatitude: data.latitude,
      punchInLongitude: data.longitude,
    });

    // Broadcast WORKING status to manager's team room
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { managerId: true },
    });
    broadcastEmployeeStatus(user?.managerId, companyId, userId, 'WORKING');

    return record;
  }

  public async punchOut(
    companyId: string,
    userId: string,
    data: { latitude: number; longitude: number }
  ): Promise<Attendance> {
    // 1. Find active punch
    const active = await this.attendanceRepository.findActivePunch(companyId, userId);
    if (!active) {
      throw new AppError('NOT_PUNCHED_IN', 'No active punch-in record found', 400);
    }

    // 2. Compute working hours (BR-AT05)
    const punchOutTime = new Date();
    const timeDiffMs = punchOutTime.getTime() - active.punchInTime.getTime();
    const workingHours = Math.round((timeDiffMs / (1000 * 60 * 60)) * 100) / 100;

    const record = await this.attendanceRepository.updatePunchOut(active.id, {
      punchOutTime,
      punchOutLatitude: data.latitude,
      punchOutLongitude: data.longitude,
      workingHours,
    });

    // Broadcast OFFLINE status to manager's team room
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { managerId: true },
    });
    broadcastEmployeeStatus(user?.managerId, companyId, userId, 'OFFLINE');

    return record;
  }

  public async getHistory(companyId: string, userId: string): Promise<Attendance[]> {
    return this.attendanceRepository.findHistory(companyId, userId);
  }

  public async getToday(companyId: string, userId: string): Promise<Attendance | null> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.attendanceRepository.findForDay(companyId, userId, startOfDay, endOfDay);
  }

  public async getEmployeeAttendanceForDate(
    companyId: string,
    employeeId: string,
    dateStr?: string
  ): Promise<Attendance | null> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    return this.attendanceRepository.findForDay(companyId, employeeId, startOfDay, endOfDay);
  }

  public async getTeamAttendance(
    companyId: string,
    managerId: string,
    dateStr?: string
  ): Promise<Attendance[]> {
    const subordinates = await prisma.user.findMany({
      where: { companyId, managerId, deletedAt: null },
      select: { id: true },
    });
    const ids = [managerId, ...subordinates.map((s) => s.id)];

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    return this.attendanceRepository.findTeamForDate(companyId, ids, startOfDay, endOfDay);
  }

  public async getCompanyAttendance(companyId: string, dateStr?: string): Promise<Attendance[]> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    return this.attendanceRepository.findCompanyForDate(companyId, startOfDay, endOfDay);
  }

  public async getMonthlyAttendance(
    companyId: string,
    userId: string,
    year?: number,
    month?: number
  ): Promise<Attendance[]> {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month !== undefined ? month - 1 : now.getMonth();
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return this.attendanceRepository.findMonthly(companyId, userId, startOfMonth, endOfMonth);
  }

  public async getSummary(
    companyId: string,
    userId: string,
    mode: 'monthly' | 'all' | 'today' = 'monthly',
    year?: number,
    month?: number
  ) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month !== undefined ? month - 1 : now.getMonth();

    if (mode === 'monthly') {
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const records = await this.attendanceRepository.findMonthly(companyId, userId, startOfMonth, endOfMonth);

      const dailyMap = new Map<string, { date: string; dayOfWeek: string; totalHours: number; sessionsCount: number; records: Attendance[] }>();
      let monthTotalHours = 0;

      for (const rec of records) {
        const d = new Date(rec.punchInTime);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
        const hours = rec.workingHours ? Number(rec.workingHours) : 0;

        monthTotalHours += hours;

        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            dayOfWeek,
            totalHours: 0,
            sessionsCount: 0,
            records: []
          });
        }

        const entry = dailyMap.get(dateKey)!;
        entry.totalHours = Math.round((entry.totalHours + hours) * 100) / 100;
        entry.sessionsCount += 1;
        entry.records.push(rec);
      }

      const days = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

      return {
        mode: 'monthly',
        month: m + 1,
        year: y,
        monthName: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalHours: Math.round(monthTotalHours * 100) / 100,
        totalDaysWorked: days.length,
        days
      };
    }

    if (mode === 'all') {
      const records = await this.attendanceRepository.findHistory(companyId, userId, 1000);
      const monthlyMap = new Map<string, { monthKey: string; monthName: string; totalHours: number; sessionsCount: number; daysWorkedSet: Set<string> }>();
      let grandTotalHours = 0;

      for (const rec of records) {
        const d = new Date(rec.punchInTime);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const hours = rec.workingHours ? Number(rec.workingHours) : 0;

        grandTotalHours += hours;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            monthKey,
            monthName,
            totalHours: 0,
            sessionsCount: 0,
            daysWorkedSet: new Set()
          });
        }

        const entry = monthlyMap.get(monthKey)!;
        entry.totalHours = Math.round((entry.totalHours + hours) * 100) / 100;
        entry.sessionsCount += 1;
        entry.daysWorkedSet.add(dateKey);
      }

      const months = Array.from(monthlyMap.values()).map(mItem => ({
        monthKey: mItem.monthKey,
        monthName: mItem.monthName,
        totalHours: mItem.totalHours,
        sessionsCount: mItem.sessionsCount,
        daysWorked: mItem.daysWorkedSet.size
      })).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      return {
        mode: 'all',
        totalHours: Math.round(grandTotalHours * 100) / 100,
        totalMonths: months.length,
        months
      };
    }

    const now2 = new Date();
    const startOfDay = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
    const endOfDay = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 23, 59, 59, 999);
    const todayRecords = await this.attendanceRepository.findMonthly(companyId, userId, startOfDay, endOfDay);
    const todayHours = todayRecords.reduce((acc, r) => acc + (r.workingHours ? Number(r.workingHours) : 0), 0);

    return {
      mode: 'today',
      date: startOfDay.toISOString().split('T')[0],
      totalHours: Math.round(todayHours * 100) / 100,
      sessionsCount: todayRecords.length,
      records: todayRecords
    };
  }
}
