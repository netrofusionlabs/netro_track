import { prisma } from '../../shared/config/prisma';
import { Attendance, Prisma } from '@prisma/client';

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
    attendancePolicyId?: string | null;
    policySnapshot?: Prisma.InputJsonValue;
    punchInEvidence?: Prisma.InputJsonValue;
  }): Promise<Attendance> {
    return prisma.attendance.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        punchInTime: data.punchInTime,
        punchInLatitude: data.punchInLatitude,
        punchInLongitude: data.punchInLongitude,
        attendancePolicyId: data.attendancePolicyId,
        policySnapshot: data.policySnapshot,
        punchInEvidence: data.punchInEvidence
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
      punchOutEvidence?: Prisma.InputJsonValue;
    }
  ): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id },
      data: {
        punchOutTime: data.punchOutTime,
        punchOutLatitude: data.punchOutLatitude,
        punchOutLongitude: data.punchOutLongitude,
        workingHours: data.workingHours,
        punchOutEvidence: data.punchOutEvidence
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

  // ── Regularization Operations ──────────────────────────────────────────────

  public async findRegularizationForDate(userId: string, date: Date) {
    return prisma.attendanceRegularization.findFirst({
      where: {
        userId,
        date: {
          equals: date
        }
      }
    });
  }

  public async createRegularization(data: {
    companyId: string;
    userId: string;
    attendanceId?: string | null;
    date: Date;
    requestedPunchIn?: Date | null;
    requestedPunchOut?: Date | null;
    originalPunchIn?: Date | null;
    originalPunchOut?: Date | null;
    requestedPunchInOdometer?: number | null;
    requestedPunchOutOdometer?: number | null;
    originalPunchInOdometer?: number | null;
    originalPunchOutOdometer?: number | null;
    reason: string;
  }) {
    return prisma.attendanceRegularization.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        attendanceId: data.attendanceId || null,
        date: data.date,
        requestedPunchIn: data.requestedPunchIn || null,
        requestedPunchOut: data.requestedPunchOut || null,
        originalPunchIn: data.originalPunchIn || null,
        originalPunchOut: data.originalPunchOut || null,
        requestedPunchInOdometer: data.requestedPunchInOdometer || null,
        requestedPunchOutOdometer: data.requestedPunchOutOdometer || null,
        originalPunchInOdometer: data.originalPunchInOdometer || null,
        originalPunchOutOdometer: data.originalPunchOutOdometer || null,
        reason: data.reason,
        status: 'PENDING'
      }
    });
  }

  public async findMonthlyRegularizationsCount(userId: string, startOfMonth: Date, endOfMonth: Date): Promise<number> {
    return prisma.attendanceRegularization.count({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
  }

  public async findRegularizations(params: {
    companyId: string;
    userId?: string;
    teamUserIds?: string[];
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }) {
    return prisma.attendanceRegularization.findMany({
      where: {
        companyId: params.companyId,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.teamUserIds ? { userId: { in: params.teamUserIds } } : {}),
        ...(params.status ? { status: params.status } : {})
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        approver: { select: { id: true, name: true } },
        attendance: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findRegularizationById(id: string) {
    return prisma.attendanceRegularization.findUnique({
      where: { id },
      include: {
        company: true,
        user: true,
        attendance: true
      }
    });
  }

  public async updateRegularizationStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    approvedBy: string,
    remarks: string | null,
    attendanceId?: string | null
  ) {
    return prisma.attendanceRegularization.update({
      where: { id },
      data: {
        status,
        approvedBy,
        remarks,
        ...(attendanceId ? { attendanceId } : {})
      }
    });
  }

  public async updateAttendanceTimes(
    id: string,
    data: {
      punchInTime?: Date;
      punchOutTime?: Date | null;
      workingHours?: number | null;
      punchInEvidence?: Prisma.InputJsonValue;
      punchOutEvidence?: Prisma.InputJsonValue;
    }
  ) {
    return prisma.attendance.update({
      where: { id },
      data: {
        ...(data.punchInTime ? { punchInTime: data.punchInTime } : {}),
        ...(data.punchOutTime !== undefined ? { punchOutTime: data.punchOutTime } : {}),
        ...(data.workingHours !== undefined ? { workingHours: data.workingHours } : {}),
        ...(data.punchInEvidence !== undefined ? { punchInEvidence: data.punchInEvidence } : {}),
        ...(data.punchOutEvidence !== undefined ? { punchOutEvidence: data.punchOutEvidence } : {})
      }
    });
  }

  public async findAttendanceById(id: string) {
    return prisma.attendance.findUnique({
      where: { id }
    });
  }

  public async findSubordinateIds(companyId: string, managerId: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { companyId, managerId, deletedAt: null },
      select: { id: true }
    });
    return users.map(u => u.id);
  }

  public async findPolicyById(id: string) {
    return prisma.attendancePolicy.findUnique({
      where: { id }
    });
  }

  public async createAttendance(data: {
    companyId: string;
    userId: string;
    punchInTime: Date;
    punchInLatitude: number;
    punchInLongitude: number;
    punchOutTime?: Date | null;
    punchOutLatitude?: number | null;
    punchOutLongitude?: number | null;
    workingHours?: number | null;
    attendancePolicyId?: string | null;
    policySnapshot?: Prisma.InputJsonValue;
    punchInEvidence?: Prisma.InputJsonValue;
    punchOutEvidence?: Prisma.InputJsonValue;
  }) {
    return prisma.attendance.create({
      data
    });
  }
}
