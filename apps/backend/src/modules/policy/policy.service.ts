import { PolicyRepository } from './policy.repository';
import { AppError } from '../../shared/errors/AppError';
import { AttendancePolicy, PolicyType, PolicyTargetType, TimelineEventType } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';
import {
  PunchConfig,
  RegularizationConfig,
  PunchComponentStatus,
  LeavePolicyConfig,
  ExpensePolicyConfig,
  TrackingPolicyConfig,
  VisitPolicyConfig,
  InspectionPolicyConfig,
} from '@netrotrack/shared';

export interface EffectivePolicyResult {
  source: 'USER' | 'DEPARTMENT' | 'DESIGNATION' | 'COMPANY' | 'SYSTEM';
  policyId: string | null;
  policyName: string;
  policyType: PolicyType;
  config: Record<string, unknown>;
  // Typed getters for attendance backward compatibility
  punchInConfig: PunchConfig;
  punchOutConfig: PunchConfig;
  regularizationConfig: RegularizationConfig;
}

export class PolicyService {
  private repository = new PolicyRepository();

  public async getPolicies(companyId: string, type?: PolicyType): Promise<AttendancePolicy[]> {
    return this.repository.findMany(companyId, type);
  }

  public async getPolicyById(companyId: string, id: string): Promise<AttendancePolicy> {
    const policy = await this.repository.findById(companyId, id);
    if (!policy) {
      throw new AppError('POLICY_NOT_FOUND', 'Policy not found', 404);
    }
    return policy;
  }

  public async createPolicy(
    companyId: string,
    input: {
      type?: PolicyType;
      name: string;
      description?: string | null;
      isActive?: boolean;
      config?: Record<string, unknown>;
      punchInConfig?: PunchConfig;
      punchOutConfig?: PunchConfig;
      regularizationConfig?: RegularizationConfig;
    }
  ): Promise<AttendancePolicy> {
    return this.repository.create(companyId, input);
  }

  public async updatePolicy(
    companyId: string,
    id: string,
    input: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      config?: Record<string, unknown>;
      punchInConfig?: PunchConfig;
      punchOutConfig?: PunchConfig;
      regularizationConfig?: RegularizationConfig;
    }
  ): Promise<AttendancePolicy> {
    await this.getPolicyById(companyId, id);
    return this.repository.update(companyId, id, input);
  }

  public async deletePolicy(companyId: string, id: string): Promise<AttendancePolicy> {
    const policy = await this.getPolicyById(companyId, id);

    // Guard: check if this is currently the default policy of the company
    const defaultPolicy = await this.repository.getCompanyDefaultPolicy(companyId, policy.type);
    if (defaultPolicy?.id === id) {
      throw new AppError(
        'CANNOT_DELETE_DEFAULT_POLICY',
        `Cannot delete this policy because it is currently set as the company default for ${policy.type}`,
        400
      );
    }

    // Check assignments
    const assignments = await this.repository.getPolicyAssignmentsCount(id);
    if (assignments.total > 0) {
      throw new AppError(
        'CANNOT_DELETE_ASSIGNED_POLICY',
        `Cannot delete this policy because it is currently assigned to ${assignments.users} employees, ${assignments.departments} departments, and ${assignments.designations} designations. Reassign them first.`,
        400
      );
    }

    return this.repository.softDelete(companyId, id);
  }

  public async duplicatePolicy(companyId: string, id: string): Promise<AttendancePolicy> {
    const original = await this.getPolicyById(companyId, id);
    return this.repository.create(companyId, {
      type: original.type,
      name: `${original.name} (Copy)`,
      description: original.description ? `Copy of ${original.description}` : null,
      isActive: original.isActive,
      config: (original.config || {}) as Record<string, unknown>,
      punchInConfig: original.punchInConfig as unknown as PunchConfig,
      punchOutConfig: original.punchOutConfig as unknown as PunchConfig,
      regularizationConfig: original.regularizationConfig as unknown as RegularizationConfig,
    });
  }

  public async getPolicyAssignments(companyId: string, id: string) {
    await this.getPolicyById(companyId, id);
    const counts = await this.repository.getPolicyAssignmentsCount(id);

    // Fetch assignments from both legacy foreign keys and PolicyAssignment table
    const [legacyDepts, legacyDesigs, legacyUsers, genericAssignments] = await Promise.all([
      prisma.department.findMany({
        where: { attendancePolicyId: id, companyId },
        select: { id: true, name: true },
      }),
      prisma.designation.findMany({
        where: { attendancePolicyId: id, companyId },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { attendancePolicyId: id, companyId, deletedAt: null },
        select: { id: true, name: true, employeeId: true, role: true },
      }),
      prisma.policyAssignment.findMany({
        where: { policyId: id, companyId },
      }),
    ]);

    const genericDeptIds = genericAssignments
      .filter((a) => a.targetType === PolicyTargetType.DEPARTMENT)
      .map((a) => a.targetId);
    const genericDesigIds = genericAssignments
      .filter((a) => a.targetType === PolicyTargetType.DESIGNATION)
      .map((a) => a.targetId);
    const genericUserIds = genericAssignments
      .filter((a) => a.targetType === PolicyTargetType.USER)
      .map((a) => a.targetId);

    const [extraDepts, extraDesigs, extraUsers] = await Promise.all([
      genericDeptIds.length > 0
        ? prisma.department.findMany({
            where: { id: { in: genericDeptIds }, companyId },
            select: { id: true, name: true },
          })
        : [],
      genericDesigIds.length > 0
        ? prisma.designation.findMany({
            where: { id: { in: genericDesigIds }, companyId },
            select: { id: true, name: true },
          })
        : [],
      genericUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: genericUserIds }, companyId, deletedAt: null },
            select: { id: true, name: true, employeeId: true, role: true },
          })
        : [],
    ]);

    // Merge distinct
    const departmentMap = new Map<string, { id: string; name: string }>();
    legacyDepts.forEach((d) => departmentMap.set(d.id, d));
    extraDepts.forEach((d) => departmentMap.set(d.id, d));

    const designationMap = new Map<string, { id: string; name: string }>();
    legacyDesigs.forEach((d) => designationMap.set(d.id, d));
    extraDesigs.forEach((d) => designationMap.set(d.id, d));

    const userMap = new Map<string, { id: string; name: string; employeeId: string | null; role: string }>();
    legacyUsers.forEach((u) => userMap.set(u.id, u));
    extraUsers.forEach((u) => userMap.set(u.id, u));

    return {
      counts: {
        departments: departmentMap.size,
        designations: designationMap.size,
        users: userMap.size,
        total: departmentMap.size + designationMap.size + userMap.size,
      },
      details: {
        departments: Array.from(departmentMap.values()),
        designations: Array.from(designationMap.values()),
        users: Array.from(userMap.values()),
      },
    };
  }

  public async getEffectivePolicyForUser(
    companyId: string,
    userId: string,
    policyType: PolicyType = PolicyType.ATTENDANCE
  ): Promise<EffectivePolicyResult> {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
      include: {
        department: true,
        designation: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    const defaultAttendanceRegConfig: RegularizationConfig = {
      allowRegularization: true,
      allowMissedPunch: true,
      allowTimeCorrection: true,
      maxRequestsPerMonth: 5,
      regularizationWindowDays: 7,
    };

    const buildResult = (
      source: 'USER' | 'DEPARTMENT' | 'DESIGNATION' | 'COMPANY',
      policy: AttendancePolicy
    ): EffectivePolicyResult => {
      const configPayload = ((policy.config as Record<string, unknown>) || {}) as Record<string, unknown>;
      const punchIn = (policy.punchInConfig as unknown as PunchConfig) || configPayload.punchInConfig;
      const punchOut = (policy.punchOutConfig as unknown as PunchConfig) || configPayload.punchOutConfig;
      const reg =
        (policy.regularizationConfig as unknown as RegularizationConfig) ||
        configPayload.regularizationConfig ||
        defaultAttendanceRegConfig;

      return {
        source,
        policyId: policy.id,
        policyName: policy.name,
        policyType: policy.type,
        config: configPayload,
        punchInConfig: punchIn,
        punchOutConfig: punchOut,
        regularizationConfig: reg,
      };
    };

    // 1. User Level Override
    const userAssignment = await prisma.policyAssignment.findFirst({
      where: {
        companyId,
        policyType,
        targetType: PolicyTargetType.USER,
        targetId: userId,
      },
      include: { policy: true },
    });

    if (userAssignment?.policy && userAssignment.policy.isActive && !userAssignment.policy.deletedAt) {
      return buildResult('USER', userAssignment.policy);
    }

    if (policyType === PolicyType.ATTENDANCE && user.attendancePolicyId) {
      const legacyUserPolicy = await prisma.attendancePolicy.findFirst({
        where: { id: user.attendancePolicyId, companyId, deletedAt: null, isActive: true },
      });
      if (legacyUserPolicy) {
        return buildResult('USER', legacyUserPolicy);
      }
    }

    // 2. Department Level Default
    if (user.departmentId) {
      const deptAssignment = await prisma.policyAssignment.findFirst({
        where: {
          companyId,
          policyType,
          targetType: PolicyTargetType.DEPARTMENT,
          targetId: user.departmentId,
        },
        include: { policy: true },
      });

      if (deptAssignment?.policy && deptAssignment.policy.isActive && !deptAssignment.policy.deletedAt) {
        return buildResult('DEPARTMENT', deptAssignment.policy);
      }

      if (policyType === PolicyType.ATTENDANCE && user.department?.attendancePolicyId) {
        const legacyDeptPolicy = await prisma.attendancePolicy.findFirst({
          where: { id: user.department.attendancePolicyId, companyId, deletedAt: null, isActive: true },
        });
        if (legacyDeptPolicy) {
          return buildResult('DEPARTMENT', legacyDeptPolicy);
        }
      }
    }

    // 3. Designation Level Default
    if (user.designationId) {
      const desigAssignment = await prisma.policyAssignment.findFirst({
        where: {
          companyId,
          policyType,
          targetType: PolicyTargetType.DESIGNATION,
          targetId: user.designationId,
        },
        include: { policy: true },
      });

      if (desigAssignment?.policy && desigAssignment.policy.isActive && !desigAssignment.policy.deletedAt) {
        return buildResult('DESIGNATION', desigAssignment.policy);
      }

      if (policyType === PolicyType.ATTENDANCE && user.designation?.attendancePolicyId) {
        const legacyDesigPolicy = await prisma.attendancePolicy.findFirst({
          where: { id: user.designation.attendancePolicyId, companyId, deletedAt: null, isActive: true },
        });
        if (legacyDesigPolicy) {
          return buildResult('DESIGNATION', legacyDesigPolicy);
        }
      }
    }

    // 4. Company Level Default
    const companyDefault = await this.repository.getCompanyDefaultPolicy(companyId, policyType);
    if (companyDefault && companyDefault.isActive && !companyDefault.deletedAt) {
      return buildResult('COMPANY', companyDefault);
    }

    // 5. Built-in System Fallback (Per Policy Type)
    return this.getSystemFallbackPolicy(companyId, policyType);
  }

  private async getSystemFallbackPolicy(companyId: string, policyType: PolicyType): Promise<EffectivePolicyResult> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { isGpsEnabled: true },
    });
    const defaultGpsStatus = (company?.isGpsEnabled !== false ? 'REQUIRED' : 'DISABLED') as PunchComponentStatus;

    const fallbackPunchConfig: PunchConfig = {
      selfie: 'DISABLED',
      gps: defaultGpsStatus,
      vehicleMeter: 'DISABLED',
      vehiclePhoto: 'DISABLED',
      workSitePhoto: 'DISABLED',
      customerLocation: 'DISABLED',
      remarks: 'DISABLED',
      signature: 'DISABLED',
      customFields: [],
    };

    const fallbackRegularizationConfig: RegularizationConfig = {
      allowRegularization: true,
      allowMissedPunch: true,
      allowTimeCorrection: true,
      maxRequestsPerMonth: 5,
      regularizationWindowDays: 7,
    };

    let fallbackConfig: Record<string, unknown> = {};

    switch (policyType) {
      case PolicyType.ATTENDANCE:
        fallbackConfig = {
          punchInConfig: fallbackPunchConfig,
          punchOutConfig: fallbackPunchConfig,
          regularizationConfig: fallbackRegularizationConfig,
        };
        break;

      case PolicyType.LEAVE:
        const leaveConfig: LeavePolicyConfig = {
          annualLeaveQuota: 18,
          sickLeaveQuota: 12,
          casualLeaveQuota: 12,
          maxConsecutiveDays: 10,
          allowSandwichLeaves: true,
          allowHalfDay: true,
          noticePeriodDays: 2,
          allowNegativeBalance: false,
          maxNegativeDays: 0,
          requireManagerApproval: true,
        };
        fallbackConfig = leaveConfig as unknown as Record<string, unknown>;
        break;

      case PolicyType.EXPENSE:
        const expenseConfig: ExpensePolicyConfig = {
          maxDailyClaim: 2000,
          receiptMandatoryThreshold: 500,
          mileageRatePerKm: 12,
          autoApprovalLimit: 500,
          allowFuelExpense: true,
          allowFoodExpense: true,
          allowStayExpense: true,
          allowTravelExpense: true,
          allowMiscellaneousExpense: true,
        };
        fallbackConfig = expenseConfig as unknown as Record<string, unknown>;
        break;

      case PolicyType.TRACKING:
        const trackingConfig: TrackingPolicyConfig = {
          trackingIntervalSeconds: 120,
          workingHoursOnly: true,
          highAccuracy: true,
          batteryOptimization: true,
          geofenceRadiusMeters: 100,
          offlineSyncIntervalSeconds: 300,
        };
        fallbackConfig = trackingConfig as unknown as Record<string, unknown>;
        break;

      case PolicyType.VISIT:
        const visitConfig: VisitPolicyConfig = {
          requireCheckInSelfie: false,
          requireSignature: true,
          requireCustomerLocationVerification: true,
          maxAllowedDistanceMeters: 200,
          minVisitDurationMinutes: 5,
          requireMeetingNotes: true,
          allowOfflineVisits: true,
        };
        fallbackConfig = visitConfig as unknown as Record<string, unknown>;
        break;

      case PolicyType.INSPECTION:
        const inspectionConfig: InspectionPolicyConfig = {
          minPhotosRequired: 2,
          requireChecklistCompletion: true,
          requireSupervisorSignoff: false,
          passThresholdScore: 70,
          requireGpsTagging: true,
        };
        fallbackConfig = inspectionConfig as unknown as Record<string, unknown>;
        break;
    }

    return {
      source: 'SYSTEM',
      policyId: null,
      policyName: `System Fallback ${policyType} Policy`,
      policyType,
      config: fallbackConfig,
      punchInConfig: fallbackPunchConfig,
      punchOutConfig: fallbackPunchConfig,
      regularizationConfig: fallbackRegularizationConfig,
    };
  }

  public async assignPolicy(
    companyId: string,
    policyId: string | null,
    policyType: PolicyType = PolicyType.ATTENDANCE,
    targetType: PolicyTargetType,
    targetId: string
  ): Promise<void> {
    // 1. If policyId is provided, verify it exists, belongs to company, and is active
    let policyName = 'None';
    if (policyId) {
      const policy = await this.getPolicyById(companyId, policyId);
      if (!policy.isActive) {
        throw new AppError('INACTIVE_POLICY', 'Cannot assign an inactive policy', 400);
      }
      policyName = policy.name;
    }

    // 2. Perform assignment update in transaction
    await prisma.$transaction(async (tx) => {
      // Upsert or Delete from generic policy_assignments table
      if (policyId) {
        await tx.policyAssignment.upsert({
          where: {
            companyId_policyType_targetType_targetId: {
              companyId,
              policyType,
              targetType,
              targetId,
            },
          },
          update: {
            policyId,
            updatedAt: new Date(),
          },
          create: {
            companyId,
            policyId,
            policyType,
            targetType,
            targetId,
          },
        });
      } else {
        await tx.policyAssignment.deleteMany({
          where: {
            companyId,
            policyType,
            targetType,
            targetId,
          },
        });
      }

      // Legacy fallback synchronization for ATTENDANCE
      if (policyType === PolicyType.ATTENDANCE) {
        switch (targetType) {
          case PolicyTargetType.COMPANY:
            await tx.company.update({
              where: { id: companyId },
              data: { defaultAttendancePolicyId: policyId },
            });
            break;

          case PolicyTargetType.DEPARTMENT:
            await tx.department.updateMany({
              where: { id: targetId, companyId },
              data: { attendancePolicyId: policyId },
            });
            break;

          case PolicyTargetType.DESIGNATION:
            await tx.designation.updateMany({
              where: { id: targetId, companyId },
              data: { attendancePolicyId: policyId },
            });
            break;

          case PolicyTargetType.USER:
            await tx.user.updateMany({
              where: { id: targetId, companyId },
              data: { attendancePolicyId: policyId },
            });
            break;
        }
      }

      // Log User Timeline Event if target is USER
      if (targetType === PolicyTargetType.USER) {
        const eventType: TimelineEventType = policyId ? 'POLICY_ASSIGNED' : 'POLICY_CHANGED';
        await tx.userTimelineEvent.create({
          data: {
            userId: targetId,
            companyId,
            eventType,
            title: policyId ? `${policyType} Policy Assigned` : `${policyType} Policy Removed`,
            description: policyId
              ? `Assigned ${policyType.toLowerCase()} policy set to "${policyName}"`
              : `Assigned ${policyType.toLowerCase()} policy override removed`,
            newValue: policyId || null,
            effectiveDate: new Date(),
          },
        });
      }
    });
  }
}
