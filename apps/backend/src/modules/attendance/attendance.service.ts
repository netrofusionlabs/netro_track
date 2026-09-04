/**
 * AttendanceService — business logic for punch-in / punch-out / history.
 *
 * After every punch-in or punch-out, emits `employee:status` via Socket.IO
 * so managers see real-time presence changes on their dashboard.
 */
import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../shared/errors/AppError';
import { Attendance, Prisma } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';
import { broadcastEmployeeStatus } from '../../shared/config/socket';
import { AttendancePolicyService } from '../attendance-policy/attendance-policy.service';
import { PunchConfig } from '@netrotrack/shared';
import { ApprovalService } from '../../shared/services/approval.service';

import { calculateHaversineDistance } from '../../shared/utils/distance';

export class AttendanceService {
  private attendanceRepository = new AttendanceRepository();
  private policyService = new AttendancePolicyService();
  private approvalService = new ApprovalService();

  private validateEvidence(config: PunchConfig, evidence: Record<string, unknown> | null | undefined, latitude: number, longitude: number) {
    const payload = (evidence || {}) as Record<string, unknown>;

    // Validate GPS if required by policy
    if (config.gps === 'REQUIRED') {
      if (latitude === 0 && longitude === 0) {
        throw new AppError('GPS_REQUIRED', 'GPS location is required by your attendance policy', 400);
      }
    }

    const fieldsToValidate = [
      { key: 'selfie', label: 'Selfie' },
      { key: 'vehicleMeter', label: 'Vehicle Meter Reading' },
      { key: 'vehiclePhoto', label: 'Vehicle Photo' },
      { key: 'workSitePhoto', label: 'Work Site Photo' },
      { key: 'customerLocation', label: 'Customer Location' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'signature', label: 'Signature' }
    ];

    for (const field of fieldsToValidate) {
      const status = config[field.key as keyof PunchConfig] as string;
      if (status === 'REQUIRED') {
        const val = payload[field.key];
        if (val === undefined || val === null || val === '') {
          throw new AppError('MISSING_EVIDENCE', `${field.label} is required by your attendance policy`, 400);
        }
        // Additional check for vehicleMeterPhoto when vehicleMeter is required
        if (field.key === 'vehicleMeter') {
          const photoVal = payload['vehicleMeterPhoto'];
          if (photoVal === undefined || photoVal === null || photoVal === '') {
            throw new AppError('MISSING_EVIDENCE', 'Vehicle Meter Photo is required by your attendance policy', 400);
          }
        }
      }
    }

    // Validate custom fields
    const customFields = config.customFields || [];
    for (const cf of customFields) {
      if (cf.status === 'REQUIRED') {
        const val = payload[cf.key];
        if (val === undefined || val === null || val === '') {
          throw new AppError('MISSING_EVIDENCE', `Custom field "${cf.label}" is required by your attendance policy`, 400);
        }
      }
    }
  }

  public async getActivePunch(companyId: string, userId: string): Promise<Attendance | null> {
    return this.attendanceRepository.findActivePunch(companyId, userId);
  }

  public async punchIn(
    companyId: string,
    userId: string,
    data: { latitude: number; longitude: number; evidence?: Record<string, unknown> }
  ): Promise<Attendance> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { role: true, managerId: true, branchId: true, branch: true },
    });

    if (user?.role === 'MASTER_SUPER_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') {
      throw new AppError('ATTENDANCE_NOT_APPLICABLE', 'Attendance tracking is not applicable for Company Admin and Super Admin accounts. Punch in/out is required for HR and below.', 400);
    }

    // 1. Guard: no active (un-closed) punch
    const active = await this.attendanceRepository.findActivePunch(companyId, userId);
    if (active) {
      throw new AppError('ALREADY_PUNCHED_IN', 'You are already punched in', 400);
    }

    // Resolve effective policy and validate evidence
    const effectivePolicy = await this.policyService.getEffectivePolicyForUser(companyId, userId);
    this.validateEvidence(effectivePolicy.punchInConfig, data.evidence, data.latitude, data.longitude);

    // 2. Compute branch geofence distance if user has an assigned branch with GPS
    let geofenceDistance: number | null = null;
    let isGeofenceValid: boolean | null = null;
    if (user?.branch?.latitude != null && user?.branch?.longitude != null) {
      const branchLat = Number(user.branch.latitude);
      const branchLng = Number(user.branch.longitude);
      geofenceDistance = calculateHaversineDistance(
        data.latitude,
        data.longitude,
        branchLat,
        branchLng
      );
      // Valid if within 200 meters of assigned branch location
      isGeofenceValid = geofenceDistance <= 200;
    }

    const record = await this.attendanceRepository.createPunchIn({
      companyId,
      userId,
      punchInTime: new Date(),
      punchInLatitude: data.latitude,
      punchInLongitude: data.longitude,
      attendancePolicyId: effectivePolicy.policyId,
      policySnapshot: {
        policyId: effectivePolicy.policyId,
        policyName: effectivePolicy.policyName,
        punchInConfig: effectivePolicy.punchInConfig,
        punchOutConfig: effectivePolicy.punchOutConfig,
      },
      punchInEvidence: (data.evidence || null) as Prisma.InputJsonValue,
    });

    // Broadcast WORKING status to manager's team room
    broadcastEmployeeStatus(user?.managerId, companyId, userId, 'WORKING');

    // Attach computed geofence info to response object
    return {
      ...record,
      ...(geofenceDistance !== null ? { geofenceDistance, isGeofenceValid } : {}),
    } as Attendance;
  }

  public async punchOut(
    companyId: string,
    userId: string,
    data: { latitude: number; longitude: number; evidence?: Record<string, unknown> }
  ): Promise<Attendance> {
    // 1. Find active punch
    const active = await this.attendanceRepository.findActivePunch(companyId, userId);
    if (!active) {
      throw new AppError('NOT_PUNCHED_IN', 'No active punch-in record found', 400);
    }

    // Enforce policy validation for punch out
    // If the active punch record contains a policySnapshot, use it (ensures historical consistency if policy changed during shift).
    // Otherwise resolve the current effective policy as fallback.
    const snapshot = active.policySnapshot as Record<string, unknown> | null;
    const punchOutConfig = (snapshot?.punchOutConfig ?? 
      (await this.policyService.getEffectivePolicyForUser(companyId, userId)).punchOutConfig) as PunchConfig;

    this.validateEvidence(punchOutConfig, data.evidence, data.latitude, data.longitude);

    // 2. Compute working hours (BR-AT05)
    const punchOutTime = new Date();
    const timeDiffMs = punchOutTime.getTime() - active.punchInTime.getTime();
    const workingHours = Math.round((timeDiffMs / (1000 * 60 * 60)) * 100) / 100;

    const record = await this.attendanceRepository.updatePunchOut(active.id, {
      punchOutTime,
      punchOutLatitude: data.latitude,
      punchOutLongitude: data.longitude,
      workingHours,
      punchOutEvidence: (data.evidence || null) as Prisma.InputJsonValue,
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

  // ── Regularization Requests ───────────────────────────────────────────────

  public async requestRegularization(
    companyId: string,
    userId: string,
    payload: {
      date: string;
      requestedPunchIn: string | null;
      requestedPunchOut: string | null;
      requestedPunchInOdometer?: number | null;
      requestedPunchOutOdometer?: number | null;
      reason: string;
    }
  ) {
    const targetDate = new Date(payload.date);
    const today = new Date();
    const startOfTargetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
    if (startOfTargetDay.getTime() > today.getTime()) {
      throw new AppError('FUTURE_DATE', 'Cannot request regularization for a future date', 400);
    }

    // 1. Fetch effective policy assigned to user and validate regularization permissions
    const policy = await this.policyService.getEffectivePolicyForUser(companyId, userId);
    const regConfig = policy.regularizationConfig || {
      allowRegularization: true,
      allowMissedPunch: true,
      allowTimeCorrection: true,
      maxRequestsPerMonth: 5,
      regularizationWindowDays: 7,
    };

    if (!regConfig.allowRegularization) {
      throw new AppError('REGULARIZATION_DISABLED', 'Attendance regularization is disabled by your policy', 400);
    }

    // 2. Check if there is already a pending regularization for this date
    const existing = await this.attendanceRepository.findRegularizationForDate(userId, targetDate);
    if (existing && existing.status === 'PENDING') {
      throw new AppError('REGULARIZATION_ALREADY_PENDING', 'A regularization request is already pending for this date', 400);
    }

    // 3. Find if there is an existing attendance session for this date to link
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    const existingAttendance = await this.attendanceRepository.findPunchForDay(companyId, userId, startOfDay, endOfDay);

    // 4. Validate core action permissions (missed punch vs time correction)
    if (existingAttendance) {
      if (!regConfig.allowTimeCorrection) {
        throw new AppError('TIME_CORRECTION_DISABLED', 'Attendance time correction is disabled by your policy', 400);
      }
    } else {
      if (!regConfig.allowMissedPunch) {
        throw new AppError('MISSED_PUNCH_DISABLED', 'Missed punch regularization is disabled by your policy', 400);
      }
      if (!payload.requestedPunchIn) {
        throw new AppError('INVALID_REQUEST', 'Punch In time is required to regularize a missed day', 400);
      }
    }

    // 5. Validate window period limit (regularizationWindowDays)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = startOfToday.getTime() - startOfDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > regConfig.regularizationWindowDays) {
      throw new AppError('WINDOW_EXCEEDED', `You can only request regularization within ${regConfig.regularizationWindowDays} days of the attendance date`, 400);
    }

    // 6. Validate monthly limit threshold
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyRequestsCount = await this.attendanceRepository.findMonthlyRegularizationsCount(userId, startOfMonth, endOfMonth);
    if (monthlyRequestsCount >= regConfig.maxRequestsPerMonth) {
      throw new AppError('MONTHLY_LIMIT_EXCEEDED', `You have reached the monthly limit of ${regConfig.maxRequestsPerMonth} regularization requests`, 400);
    }

    // 7. Validate times ordering if both punch times are present
    if (payload.requestedPunchIn && payload.requestedPunchOut) {
      const punchInTime = new Date(payload.requestedPunchIn);
      const punchOutTime = new Date(payload.requestedPunchOut);
      if (punchOutTime.getTime() <= punchInTime.getTime()) {
        throw new AppError('INVALID_TIMES', 'Punch Out time must be after Punch In time', 400);
      }
    }

    // 8. Capture original punch history to preserve audit logs
    const originalPunchIn = existingAttendance?.punchInTime || null;
    const originalPunchOut = existingAttendance?.punchOutTime || null;

    let originalPunchInOdometer: number | null = null;
    let originalPunchOutOdometer: number | null = null;
    if (existingAttendance) {
      const inEv = existingAttendance.punchInEvidence as Record<string, unknown> | null;
      const outEv = existingAttendance.punchOutEvidence as Record<string, unknown> | null;
      if (inEv && inEv.vehicleMeter != null) {
        originalPunchInOdometer = Number(inEv.vehicleMeter);
      }
      if (outEv && outEv.vehicleMeter != null) {
        originalPunchOutOdometer = Number(outEv.vehicleMeter);
      }
    }

    // 9. Create the regularization request
    return this.attendanceRepository.createRegularization({
      companyId,
      userId,
      attendanceId: existingAttendance?.id || null,
      date: targetDate,
      requestedPunchIn: payload.requestedPunchIn ? new Date(payload.requestedPunchIn) : null,
      requestedPunchOut: payload.requestedPunchOut ? new Date(payload.requestedPunchOut) : null,
      originalPunchIn,
      originalPunchOut,
      requestedPunchInOdometer: payload.requestedPunchInOdometer != null ? Number(payload.requestedPunchInOdometer) : null,
      requestedPunchOutOdometer: payload.requestedPunchOutOdometer != null ? Number(payload.requestedPunchOutOdometer) : null,
      originalPunchInOdometer,
      originalPunchOutOdometer,
      reason: payload.reason
    });
  }

  public async getRegularizations(
    companyId: string,
    userId: string,
    role: string,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    personal?: boolean
  ) {
    // If personal is true, ignore role context and return user's own regularizations
    if (personal) {
      return this.attendanceRepository.findRegularizations({ companyId, userId, status });
    }

    // If user is a MANAGER, HR, or ADMIN, return all pending/reviewed team or company regularizations
    if (role === 'COMPANY_ADMIN' || role === 'HR' || role === 'SUPER_ADMIN') {
      return this.attendanceRepository.findRegularizations({ companyId, status });
    } else if (role === 'MANAGER') {
      const teamUserIds = await this.attendanceRepository.findSubordinateIds(companyId, userId);
      return this.attendanceRepository.findRegularizations({ companyId, teamUserIds, status });
    } else {
      // Field employee returns their own requests
      return this.attendanceRepository.findRegularizations({ companyId, userId, status });
    }
  }

  public async reviewRegularization(
    companyId: string,
    reviewerId: string,
    id: string,
    action: 'APPROVED' | 'REJECTED',
    remarks: string | null
  ) {
    const request = await this.attendanceRepository.findRegularizationById(id);
    if (!request || request.companyId !== companyId) {
      throw new AppError('NOT_FOUND', 'Regularization request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('ALREADY_REVIEWED', 'Regularization request has already been reviewed', 400);
    }

    // Authorization: use the approval service hierarchy check
    const approvalCheck = await this.approvalService.canApprove(reviewerId, {
      requestType: 'ATTENDANCE_REGULARIZATION',
      requestId: id,
      requesterId: request.userId,
      requesterCompanyId: companyId,
      requestStatus: request.status,
    });
    if (!approvalCheck.allowed) {
      throw new AppError('UNAUTHORIZED', approvalCheck.reason ?? 'You are not authorized to review this request', 403);
    }

    // For MANAGER role, also verify direct subordinate relationship
    const reviewer = await prisma.user.findFirst({ where: { id: reviewerId } });
    if (reviewer?.role === 'MANAGER' && !['COMPANY_ADMIN', 'HR', 'SUPER_ADMIN', 'MASTER_SUPER_ADMIN'].includes(reviewer.role)) {
      const subordinates = await this.attendanceRepository.findSubordinateIds(companyId, reviewerId);
      if (!subordinates.includes(request.userId)) {
        throw new AppError('UNAUTHORIZED', 'You are not authorized to review this request', 403);
      }
    }

    let attendanceId = request.attendanceId;

    if (action === 'APPROVED') {
      const punchIn = request.requestedPunchIn;
      const punchOut = request.requestedPunchOut;

      if (!punchIn && !punchOut) {
        throw new AppError('INVALID_REQUEST', 'Cannot approve a regularization request with no requested punch times', 400);
      }

      if (attendanceId) {
        // Update existing attendance record
        let workingHours: number | null = null;
        const currentPunch = await this.attendanceRepository.findAttendanceById(attendanceId);
        const finalIn = punchIn || currentPunch?.punchInTime;
        const finalOut = punchOut !== undefined ? punchOut : currentPunch?.punchOutTime;
        
        let inEvidence = (currentPunch?.punchInEvidence || {}) as Record<string, unknown>;
        let outEvidence = (currentPunch?.punchOutEvidence || {}) as Record<string, unknown>;

        if (request.requestedPunchInOdometer !== null && request.requestedPunchInOdometer !== undefined) {
          inEvidence = { ...inEvidence, vehicleMeter: Number(request.requestedPunchInOdometer) };
        }
        if (request.requestedPunchOutOdometer !== null && request.requestedPunchOutOdometer !== undefined) {
          outEvidence = { ...outEvidence, vehicleMeter: Number(request.requestedPunchOutOdometer) };
        }

        if (finalIn && finalOut) {
          workingHours = Math.round(((finalOut.getTime() - finalIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        }

        await this.attendanceRepository.updateAttendanceTimes(attendanceId, {
          punchInTime: finalIn,
          punchOutTime: finalOut,
          workingHours: workingHours,
          punchInEvidence: inEvidence as Prisma.InputJsonValue,
          punchOutEvidence: outEvidence as Prisma.InputJsonValue
        });
      } else {
        // Create new attendance record
        if (!punchIn) {
          throw new AppError('INVALID_REQUEST', 'Punch In time is required to create a new attendance record', 400);
        }

        let workingHours: number | null = null;
        if (punchIn && punchOut) {
          workingHours = Math.round(((punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        }

        let inEvidence: Record<string, unknown> | null = null;
        let outEvidence: Record<string, unknown> | null = null;

        if (request.requestedPunchInOdometer !== null && request.requestedPunchInOdometer !== undefined) {
          inEvidence = { vehicleMeter: Number(request.requestedPunchInOdometer) };
        }
        if (request.requestedPunchOutOdometer !== null && request.requestedPunchOutOdometer !== undefined) {
          outEvidence = { vehicleMeter: Number(request.requestedPunchOutOdometer) };
        }

        const policy = request.user.attendancePolicyId 
          ? await this.attendanceRepository.findPolicyById(request.user.attendancePolicyId)
          : null;

        const newAttendance = await this.attendanceRepository.createAttendance({
          companyId,
          userId: request.userId,
          punchInTime: punchIn,
          punchInLatitude: 0.0,
          punchInLongitude: 0.0,
          punchOutTime: punchOut,
          punchOutLatitude: 0.0,
          punchOutLongitude: 0.0,
          workingHours,
          attendancePolicyId: request.user.attendancePolicyId || null,
          policySnapshot: policy ? JSON.parse(JSON.stringify(policy)) : null,
          punchInEvidence: inEvidence as Prisma.InputJsonValue,
          punchOutEvidence: outEvidence as Prisma.InputJsonValue
        });
        attendanceId = newAttendance.id;
      }
    }

    // Update regularization request status
    const result = await this.attendanceRepository.updateRegularizationStatus(id, action, reviewerId, remarks, attendanceId);

    // Record the immutable approval audit trail
    await this.approvalService.recordApprovalAction({
      companyId,
      requestType: 'ATTENDANCE_REGULARIZATION',
      requestId: id,
      action,
      remarks: remarks ?? null,
      approverId: reviewerId,
      requesterId: request.userId,
    });

    return result;
  }

  public async bulkReviewRegularizations(
    companyId: string,
    reviewerId: string,
    ids: string[],
    action: 'APPROVED' | 'REJECTED',
    remarks: string | null
  ) {
    if (!ids || ids.length === 0) {
      throw new AppError('INVALID_REQUEST', 'No regularization IDs provided', 400);
    }

    const reviewer = await prisma.user.findFirst({ where: { id: reviewerId } });
    const isManagerRole = reviewer?.role === 'MANAGER';
    const subordinateIds = isManagerRole
      ? await this.attendanceRepository.findSubordinateIds(companyId, reviewerId)
      : [];

    const results = await prisma.$transaction(async (tx) => {
      const items = [];
      for (const id of ids) {
        const request = await tx.attendanceRegularization.findUnique({
          where: { id },
          include: {
            user: true,
            attendance: true
          }
        });

        if (!request || request.companyId !== companyId) {
          throw new AppError('NOT_FOUND', `Regularization request ${id} not found`, 404);
        }

        if (request.status !== 'PENDING') {
          throw new AppError('ALREADY_REVIEWED', `Regularization request ${id} has already been reviewed`, 400);
        }

        // Use approval service hierarchy check
        const approvalCheck = await this.approvalService.canApprove(reviewerId, {
          requestType: 'ATTENDANCE_REGULARIZATION',
          requestId: id,
          requesterId: request.userId,
          requesterCompanyId: companyId,
          requestStatus: request.status,
        });
        if (!approvalCheck.allowed) {
          throw new AppError('UNAUTHORIZED', approvalCheck.reason ?? `You are not authorized to review request ${id}`, 403);
        }

        // For MANAGER role, also enforce direct subordinate relationship
        if (isManagerRole && !subordinateIds.includes(request.userId)) {
          throw new AppError('UNAUTHORIZED', `You are not authorized to review request ${id}`, 403);
        }

        let attendanceId = request.attendanceId;

        if (action === 'APPROVED') {
          const punchIn = request.requestedPunchIn;
          const punchOut = request.requestedPunchOut;

          if (!punchIn && !punchOut) {
            throw new AppError('INVALID_REQUEST', `Cannot approve request ${id} with no requested punch times`, 400);
          }

          if (attendanceId) {
            let workingHours: number | null = null;
            const currentPunch = await tx.attendance.findUnique({ where: { id: attendanceId } });
            const finalIn = punchIn || currentPunch?.punchInTime;
            const finalOut = punchOut !== undefined ? punchOut : currentPunch?.punchOutTime;
            
            if (finalIn && finalOut) {
              workingHours = Math.round(((finalOut.getTime() - finalIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
            }

            await tx.attendance.update({
              where: { id: attendanceId },
              data: {
                punchInTime: finalIn,
                punchOutTime: finalOut,
                workingHours: workingHours
              }
            });
          } else {
            if (!punchIn) {
              throw new AppError('INVALID_REQUEST', `Punch In time is required to approve request ${id} as a new record`, 400);
            }

            let workingHours: number | null = null;
            if (punchIn && punchOut) {
              workingHours = Math.round(((punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
            }

            const policy = request.user.attendancePolicyId 
              ? await tx.attendancePolicy.findUnique({ where: { id: request.user.attendancePolicyId } })
              : null;

            const newAttendance = await tx.attendance.create({
              data: {
                companyId,
                userId: request.userId,
                punchInTime: punchIn,
                punchInLatitude: 0.0,
                punchInLongitude: 0.0,
                punchOutTime: punchOut,
                punchOutLatitude: 0.0,
                punchOutLongitude: 0.0,
                workingHours,
                attendancePolicyId: request.user.attendancePolicyId || null,
                policySnapshot: policy ? JSON.parse(JSON.stringify(policy)) : null
              }
            });
            attendanceId = newAttendance.id;
          }
        }

        const updated = await tx.attendanceRegularization.update({
          where: { id },
          data: {
            status: action,
            approvedBy: reviewerId,
            remarks,
            attendanceId
          }
        });
        items.push({ updated, requesterId: request.userId });
      }
      return items;
    });

    // Record audit trails outside the transaction (fire-and-forget on error)
    for (const { updated, requesterId } of results as Array<{ updated: any; requesterId: string }>) {
      await this.approvalService.recordApprovalAction({
        companyId,
        requestType: 'ATTENDANCE_REGULARIZATION',
        requestId: updated.id,
        action,
        remarks: remarks ?? null,
        approverId: reviewerId,
        requesterId,
      }).catch(() => {/* non-critical — don't fail the bulk operation */});
    }

    return (results as Array<{ updated: any }>).map((r) => r.updated);
  }
}
