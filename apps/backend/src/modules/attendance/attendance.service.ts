import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../shared/errors/AppError';
import { Attendance } from '@prisma/client';

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
    // 1. Check if user already has an active (un-closed) punch
    const active = await this.attendanceRepository.findActivePunch(companyId, userId);
    if (active) {
      throw new AppError('ALREADY_PUNCHED_IN', 'You are already punched in', 400);
    }

    // 2. Check if user has already punched in today (optional, based on BR-AT02)
    // "An employee can only have one active attendance record per day"
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const punchToday = await this.attendanceRepository.findPunchForDay(companyId, userId, startOfDay, endOfDay);
    if (punchToday) {
      throw new AppError('ATTENDANCE_ALREADY_EXISTS', 'Punch-in already recorded for today', 409);
    }

    return this.attendanceRepository.createPunchIn({
      companyId,
      userId,
      punchInTime: new Date(),
      punchInLatitude: data.latitude,
      punchInLongitude: data.longitude
    });
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

    // 2. Compute working hours
    const punchOutTime = new Date();
    const timeDiffMs = punchOutTime.getTime() - active.punchInTime.getTime();
    const workingHours = Math.round((timeDiffMs / (1000 * 60 * 60)) * 100) / 100; // round to 2 decimals

    return this.attendanceRepository.updatePunchOut(active.id, {
      punchOutTime,
      punchOutLatitude: data.latitude,
      punchOutLongitude: data.longitude,
      workingHours
    });
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

  public async getTeamAttendance(
    companyId: string,
    managerId: string,
    dateStr?: string
  ): Promise<Attendance[]> {
    const { prisma } = await import('../../shared/config/prisma');
    const subordinates = await prisma.user.findMany({
      where: { companyId, managerId, deletedAt: null },
      select: { id: true }
    });
    const ids = [managerId, ...subordinates.map((s) => s.id)];

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    return this.attendanceRepository.findTeamForDate(companyId, ids, startOfDay, endOfDay);
  }

  public async getCompanyAttendance(
    companyId: string,
    dateStr?: string
  ): Promise<Attendance[]> {
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
    const m = month !== undefined ? month - 1 : now.getMonth(); // month is 1-based from client
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return this.attendanceRepository.findMonthly(companyId, userId, startOfMonth, endOfMonth);
  }
}
