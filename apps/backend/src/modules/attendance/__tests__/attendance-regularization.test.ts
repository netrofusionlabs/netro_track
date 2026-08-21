import { AttendanceService } from '../attendance.service';
import { AttendancePolicyService } from '../../attendance-policy/attendance-policy.service';
import { Role } from '@prisma/client';
import { AppError } from '../../../shared/errors/AppError';
import { prisma } from '../../../shared/config/prisma';

jest.setTimeout(30000);

describe('Attendance Regularization & Policy Service Tests', () => {
  let attendanceService: AttendanceService;
  let policyService: AttendancePolicyService;

  // DB IDs
  let companyAId: string;
  let companyBId: string;

  let managerAId: string;
  let employeeA1Id: string;
  let employeeA2Id: string;
  let employeeBId: string;

  let policyRegEnabledId: string;
  let policyRegDisabledId: string;
  let policyMissedPunchDisabledId: string;

  beforeAll(async () => {
    attendanceService = new AttendanceService();
    policyService = new AttendancePolicyService();

    // 1. Create test companies
    const companyA = await prisma.company.upsert({
      where: { code: 'REG_COMP_A' },
      update: {},
      create: { name: 'Regularization Company A', code: 'REG_COMP_A' }
    });
    companyAId = companyA.id;

    const companyB = await prisma.company.upsert({
      where: { code: 'REG_COMP_B' },
      update: {},
      create: { name: 'Regularization Company B', code: 'REG_COMP_B' }
    });
    companyBId = companyB.id;

    // 2. Create attendance policies
    const policyRegEnabled = await prisma.attendancePolicy.create({
      data: {
        companyId: companyAId,
        name: 'Reg Enabled Policy',
        punchInConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        punchOutConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        regularizationConfig: {
          allowRegularization: true,
          allowMissedPunch: true,
          allowTimeCorrection: true,
          maxRequestsPerMonth: 3,
          regularizationWindowDays: 5
        }
      }
    });
    policyRegEnabledId = policyRegEnabled.id;

    const policyRegDisabled = await prisma.attendancePolicy.create({
      data: {
        companyId: companyAId,
        name: 'Reg Disabled Policy',
        punchInConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        punchOutConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        regularizationConfig: {
          allowRegularization: false,
          allowMissedPunch: true,
          allowTimeCorrection: true,
          maxRequestsPerMonth: 3,
          regularizationWindowDays: 5
        }
      }
    });
    policyRegDisabledId = policyRegDisabled.id;

    const policyMissedPunchDisabled = await prisma.attendancePolicy.create({
      data: {
        companyId: companyAId,
        name: 'Missed Punch Disabled Policy',
        punchInConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        punchOutConfig: { selfie: 'DISABLED', gps: 'DISABLED', vehicleMeter: 'DISABLED' },
        regularizationConfig: {
          allowRegularization: true,
          allowMissedPunch: false,
          allowTimeCorrection: true,
          maxRequestsPerMonth: 3,
          regularizationWindowDays: 5
        }
      }
    });
    policyMissedPunchDisabledId = policyMissedPunchDisabled.id;

    // 3. Create test users
    // Company A Manager
    const managerA = await prisma.user.create({
      data: {
        companyId: companyAId,
        employeeId: 'MGR_A_001',
        name: 'Manager A',
        email: 'mgr_a@regularization.com',
        passwordHash: 'dummy',
        role: Role.MANAGER
      }
    });
    managerAId = managerA.id;

    // Company A Employee 1 (Supervised by Manager A)
    const employeeA1 = await prisma.user.create({
      data: {
        companyId: companyAId,
        employeeId: 'EMP_A_101',
        name: 'Employee A1',
        email: 'emp_a1@regularization.com',
        passwordHash: 'dummy',
        role: Role.EMPLOYEE,
        managerId: managerAId,
        attendancePolicyId: policyRegEnabledId
      }
    });
    employeeA1Id = employeeA1.id;

    // Company A Employee 2 (Not supervised by Manager A)
    const employeeA2 = await prisma.user.create({
      data: {
        companyId: companyAId,
        employeeId: 'EMP_A_102',
        name: 'Employee A2',
        email: 'emp_a2@regularization.com',
        passwordHash: 'dummy',
        role: Role.EMPLOYEE,
        attendancePolicyId: policyRegEnabledId
      }
    });
    employeeA2Id = employeeA2.id;

    // Company B Employee
    const employeeB = await prisma.user.create({
      data: {
        companyId: companyBId,
        employeeId: 'EMP_B_101',
        name: 'Employee B1',
        email: 'emp_b1@regularization.com',
        passwordHash: 'dummy',
        role: Role.EMPLOYEE
      }
    });
    employeeBId = employeeB.id;
  });

  afterAll(async () => {
    // Cleanup created data to keep database clean
    await prisma.attendanceRegularization.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } }
    });
    await prisma.attendance.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [managerAId, employeeA1Id, employeeA2Id, employeeBId] } }
    });
    await prisma.attendancePolicy.deleteMany({
      where: { id: { in: [policyRegEnabledId, policyRegDisabledId, policyMissedPunchDisabledId] } }
    });
  });

  describe('requestRegularization - Validation & Policy Constraints', () => {
    it('should reject regularization request when allowRegularization is disabled in policy', async () => {
      // Temporarily assign disabled policy to employee A1
      await prisma.user.update({
        where: { id: employeeA1Id },
        data: { attendancePolicyId: policyRegDisabledId }
      });

      const payload = {
        date: '2026-08-15',
        requestedPunchIn: '2026-08-15T09:00:00.000Z',
        requestedPunchOut: '2026-08-15T18:00:00.000Z',
        reason: 'Regularization disabled test'
      };

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, payload)
      ).rejects.toThrow(new AppError('REGULARIZATION_DISABLED', 'Attendance regularization is disabled by your policy', 400));

      // Revert policy to enabled
      await prisma.user.update({
        where: { id: employeeA1Id },
        data: { attendancePolicyId: policyRegEnabledId }
      });
    });

    it('should reject regularization request targeting a future date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const payload = {
        date: tomorrowStr,
        requestedPunchIn: `${tomorrowStr}T09:00:00.000Z`,
        requestedPunchOut: `${tomorrowStr}T18:00:00.000Z`,
        reason: 'Future date test'
      };

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, payload)
      ).rejects.toThrow(new AppError('FUTURE_DATE', 'Cannot request regularization for a future date', 400));
    });

    it('should reject request when date is older than regularizationWindowDays limit', async () => {
      // Policy allows 5 days window
      const dateTooPast = new Date();
      dateTooPast.setDate(dateTooPast.getDate() - 7);
      const dateStr = dateTooPast.toISOString().split('T')[0];

      const payload = {
        date: dateStr,
        requestedPunchIn: `${dateStr}T09:00:00.000Z`,
        requestedPunchOut: `${dateStr}T18:00:00.000Z`,
        reason: 'Window limit test'
      };

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, payload)
      ).rejects.toThrow(new AppError('WINDOW_EXCEEDED', 'You can only request regularization within 5 days of the attendance date', 400));
    });

    it('should reject missed punch regularization if allowMissedPunch is disabled in policy', async () => {
      // Temporarily assign missed punch disabled policy to employee A1
      await prisma.user.update({
        where: { id: employeeA1Id },
        data: { attendancePolicyId: policyMissedPunchDisabledId }
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        date: todayStr,
        requestedPunchIn: `${todayStr}T09:00:00.000Z`,
        requestedPunchOut: `${todayStr}T18:00:00.000Z`,
        reason: 'Missed punch disabled test'
      };

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, payload)
      ).rejects.toThrow(new AppError('MISSED_PUNCH_DISABLED', 'Missed punch regularization is disabled by your policy', 400));

      // Revert policy to enabled
      await prisma.user.update({
        where: { id: employeeA1Id },
        data: { attendancePolicyId: policyRegEnabledId }
      });
    });

    it('should submit a valid missed punch request successfully and persist in DB', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        date: todayStr,
        requestedPunchIn: `${todayStr}T09:00:00.000Z`,
        requestedPunchOut: `${todayStr}T18:00:00.000Z`,
        requestedPunchInOdometer: 1000,
        requestedPunchOutOdometer: 1020,
        reason: 'Valid missed punch request'
      };

      const request = await attendanceService.requestRegularization(companyAId, employeeA1Id, payload);
      expect(request).toBeDefined();
      expect(request.status).toBe('PENDING');
      expect(request.requestedPunchInOdometer).toBe(1000);
      expect(request.requestedPunchOutOdometer).toBe(1020);
      expect(request.reason).toBe('Valid missed punch request');

      // Verify db persistence
      const dbRequest = await prisma.attendanceRegularization.findUnique({ where: { id: request.id } });
      expect(dbRequest).toBeDefined();
      expect(dbRequest?.reason).toBe('Valid missed punch request');
    });

    it('should reject duplicate pending requests for the same date', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        date: todayStr,
        requestedPunchIn: `${todayStr}T10:00:00.000Z`,
        requestedPunchOut: `${todayStr}T19:00:00.000Z`,
        reason: 'Duplicate request test'
      };

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, payload)
      ).rejects.toThrow(new AppError('REGULARIZATION_ALREADY_PENDING', 'A regularization request is already pending for this date', 400));
    });

    it('should reject request when monthly limit maxRequestsPerMonth is exceeded', async () => {
      // Policy monthly limit is 3. We have 1 pending request now. Let's add 2 more for different past dates to hit the limit.
      const pastDate1 = new Date();
      pastDate1.setDate(pastDate1.getDate() - 1);
      const date1Str = pastDate1.toISOString().split('T')[0];

      await attendanceService.requestRegularization(companyAId, employeeA1Id, {
        date: date1Str,
        requestedPunchIn: `${date1Str}T09:00:00.000Z`,
        requestedPunchOut: `${date1Str}T18:00:00.000Z`,
        reason: 'Monthly limit filler 1'
      });

      const pastDate2 = new Date();
      pastDate2.setDate(pastDate2.getDate() - 2);
      const date2Str = pastDate2.toISOString().split('T')[0];

      await attendanceService.requestRegularization(companyAId, employeeA1Id, {
        date: date2Str,
        requestedPunchIn: `${date2Str}T09:00:00.000Z`,
        requestedPunchOut: `${date2Str}T18:00:00.000Z`,
        reason: 'Monthly limit filler 2'
      });

      // Attempt 4th request (should exceed limit)
      const pastDate3 = new Date();
      pastDate3.setDate(pastDate3.getDate() - 3);
      const date3Str = pastDate3.toISOString().split('T')[0];

      await expect(
        attendanceService.requestRegularization(companyAId, employeeA1Id, {
          date: date3Str,
          requestedPunchIn: `${date3Str}T09:00:00.000Z`,
          requestedPunchOut: `${date3Str}T18:00:00.000Z`,
          reason: 'Limit breaker'
        })
      ).rejects.toThrow(new AppError('MONTHLY_LIMIT_EXCEEDED', 'You have reached the monthly limit of 3 regularization requests', 400));
    });
  });

  describe('reviewRegularization - Manager hierarchy and approvals', () => {
    let pendingRegId: string;
    let employeeA2RegId: string;

    beforeAll(async () => {
      // Clear company A regularizations for a clean state
      await prisma.attendanceRegularization.deleteMany({ where: { companyId: companyAId } });

      // Create a fresh pending request for supervised Employee A1
      const todayStr = new Date().toISOString().split('T')[0];
      const reg = await attendanceService.requestRegularization(companyAId, employeeA1Id, {
        date: todayStr,
        requestedPunchIn: `${todayStr}T09:00:00.000Z`,
        requestedPunchOut: `${todayStr}T18:00:00.000Z`,
        requestedPunchInOdometer: 5000,
        requestedPunchOutOdometer: 5015,
        reason: 'Review verification'
      });
      pendingRegId = reg.id;

      // Create a fresh pending request for non-supervised Employee A2
      const regA2 = await attendanceService.requestRegularization(companyAId, employeeA2Id, {
        date: todayStr,
        requestedPunchIn: `${todayStr}T09:00:00.000Z`,
        requestedPunchOut: `${todayStr}T18:00:00.000Z`,
        reason: 'Review verification'
      });
      employeeA2RegId = regA2.id;
    });

    it('should allow supervisor manager to review/approve immediate subordinate request', async () => {
      const result = await attendanceService.reviewRegularization(companyAId, managerAId, pendingRegId, 'APPROVED', 'Looks good');
      expect(result.status).toBe('APPROVED');
      expect(result.remarks).toBe('Looks good');
      expect(result.approvedBy).toBe(managerAId);

      // Verify associated attendance record was created for the missed day
      expect(result.attendanceId).not.toBeNull();
      const attendance = await prisma.attendance.findUnique({ where: { id: result.attendanceId! } });
      expect(attendance).toBeDefined();
      expect(attendance?.workingHours?.toNumber()).toBe(9); // 9h working hours

      // Odometer logs verify
      const inEv = attendance?.punchInEvidence as any;
      const outEv = attendance?.punchOutEvidence as any;
      expect(inEv?.vehicleMeter).toBe(5000);
      expect(outEv?.vehicleMeter).toBe(5015);
    });

    it('should reject manager review of non-subordinate employee requests', async () => {
      await expect(
        attendanceService.reviewRegularization(companyAId, managerAId, employeeA2RegId, 'APPROVED', 'Unauthorized')
      ).rejects.toThrow(new AppError('UNAUTHORIZED', 'You are not authorized to review this request', 403));
    });

    it('should reject review of already reviewed requests', async () => {
      await expect(
        attendanceService.reviewRegularization(companyAId, managerAId, pendingRegId, 'APPROVED', 'Already reviewed')
      ).rejects.toThrow(new AppError('ALREADY_REVIEWED', 'Regularization request has already been reviewed', 400));
    });
  });

  describe('Tenant Isolation Safeguards', () => {
    let companyBRegId: string;

    beforeAll(async () => {
      // Create a regularization request for Company B Employee
      const todayStr = new Date().toISOString().split('T')[0];
      const regB = await attendanceService.requestRegularization(companyBId, employeeBId, {
        date: todayStr,
        requestedPunchIn: `${todayStr}T09:00:00.000Z`,
        requestedPunchOut: `${todayStr}T18:00:00.000Z`,
        reason: 'Company B regularize'
      });
      companyBRegId = regB.id;
    });

    it('should reject cross-tenant review approvals (Manager A cannot review Company B request)', async () => {
      await expect(
        attendanceService.reviewRegularization(companyAId, managerAId, companyBRegId, 'APPROVED', 'Cross tenant block')
      ).rejects.toThrow(new AppError('NOT_FOUND', 'Regularization request not found', 404));
    });

    it('should separate list results by tenant context', async () => {
      // Query Company A requests (role COMPANY_ADMIN)
      const regListA = await attendanceService.getRegularizations(companyAId, employeeA1Id, 'COMPANY_ADMIN');
      // Query Company B requests (role COMPANY_ADMIN)
      const regListB = await attendanceService.getRegularizations(companyBId, employeeBId, 'COMPANY_ADMIN');

      const containsBInA = regListA.some((r) => r.id === companyBRegId);
      expect(containsBInA).toBe(false);

      const containsBInB = regListB.some((r) => r.id === companyBRegId);
      expect(containsBInB).toBe(true);
    });
  });
});
