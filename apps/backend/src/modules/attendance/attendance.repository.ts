import { prisma } from '../../shared/config/prisma';
import { Attendance } from '@prisma/client';

export class AttendanceRepository {
  public async findActivePunch(companyId: string, userId: string): Promise<Attendance | null> {
    return prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        punchOutTime: null
      }
    });
  }

  public async findPunchForDay(companyId: string, userId: string, startOfDay: Date, endOfDay: Date): Promise<Attendance | null> {
    return prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        punchInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
  }

  public async createPunchIn(data: {
    companyId: string;
    userId: string;
    punchInTime: Date;
    punchInLatitude: number;
    punchInLongitude: number;
  }): Promise<Attendance> {
    return prisma.attendance.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        punchInTime: data.punchInTime,
        punchInLatitude: data.punchInLatitude,
        punchInLongitude: data.punchInLongitude
      }
    });
  }

  public async updatePunchOut(
    id: string,
    data: {
      punchOutTime: Date;
      punchOutLatitude: number;
      punchOutLongitude: number;
      workingHours: number;
    }
  ): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id },
      data: {
        punchOutTime: data.punchOutTime,
        punchOutLatitude: data.punchOutLatitude,
        punchOutLongitude: data.punchOutLongitude,
        workingHours: data.workingHours
      }
    });
  }

  public async findHistory(companyId: string, userId: string, limit = 30): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: { companyId, userId },
      orderBy: { punchInTime: 'desc' },
      take: limit
    });
  }

  public async findForDay(companyId: string, userId: string, startOfDay: Date, endOfDay: Date): Promise<Attendance | null> {
    return prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        punchInTime: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { punchInTime: 'desc' }
    });
  }

  public async findTeamForDate(
    companyId: string,
    userIds: string[],
    startOfDay: Date,
    endOfDay: Date
  ): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: {
        companyId,
        userId: { in: userIds },
        punchInTime: { gte: startOfDay, lte: endOfDay }
      },
      include: { user: true },
      orderBy: { punchInTime: 'asc' }
    });
  }

  public async findCompanyForDate(
    companyId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: {
        companyId,
        punchInTime: { gte: startOfDay, lte: endOfDay }
      },
      include: { user: true },
      orderBy: { punchInTime: 'asc' }
    });
  }

  public async findMonthly(
    companyId: string,
    userId: string,
    startOfMonth: Date,
    endOfMonth: Date
  ): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: {
        companyId,
        userId,
        punchInTime: { gte: startOfMonth, lte: endOfMonth }
      },
      orderBy: { punchInTime: 'asc' }
    });
  }
}
