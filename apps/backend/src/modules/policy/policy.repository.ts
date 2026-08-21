import { prisma } from '../../shared/config/prisma';
import { AttendancePolicy, PolicyType, PolicyTargetType, Prisma } from '@prisma/client';
import { PunchConfig, RegularizationConfig } from '@netrotrack/shared';

export interface CreatePolicyRepoInput {
  type?: PolicyType;
  name: string;
  description?: string | null;
  isActive?: boolean;
  config?: Record<string, unknown>;
  punchInConfig?: PunchConfig;
  punchOutConfig?: PunchConfig;
  regularizationConfig?: RegularizationConfig;
}

export interface UpdatePolicyRepoInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  config?: Record<string, unknown>;
  punchInConfig?: PunchConfig;
  punchOutConfig?: PunchConfig;
  regularizationConfig?: RegularizationConfig;
}

export class PolicyRepository {
  public async findMany(companyId: string, type?: PolicyType): Promise<AttendancePolicy[]> {
    return prisma.attendancePolicy.findMany({
      where: {
        companyId,
        ...(type ? { type } : {}),
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async findById(companyId: string, id: string): Promise<AttendancePolicy | null> {
    return prisma.attendancePolicy.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });
  }

  public async create(companyId: string, data: CreatePolicyRepoInput): Promise<AttendancePolicy> {
    const policyType: PolicyType = data.type || PolicyType.ATTENDANCE;
    const configPayload = data.config || {};

    // Fallback punch configs if not supplied explicitly
    const punchIn = data.punchInConfig || (configPayload.punchInConfig as PunchConfig) || {
      selfie: 'DISABLED',
      gps: 'REQUIRED',
      vehicleMeter: 'DISABLED',
      vehiclePhoto: 'DISABLED',
      workSitePhoto: 'DISABLED',
      customerLocation: 'DISABLED',
      remarks: 'DISABLED',
      signature: 'DISABLED',
      customFields: [],
    };

    const punchOut = data.punchOutConfig || (configPayload.punchOutConfig as PunchConfig) || {
      selfie: 'DISABLED',
      gps: 'REQUIRED',
      vehicleMeter: 'DISABLED',
      vehiclePhoto: 'DISABLED',
      workSitePhoto: 'DISABLED',
      customerLocation: 'DISABLED',
      remarks: 'DISABLED',
      signature: 'DISABLED',
      customFields: [],
    };

    const reg = data.regularizationConfig || (configPayload.regularizationConfig as RegularizationConfig) || {
      allowRegularization: true,
      allowMissedPunch: true,
      allowTimeCorrection: true,
      maxRequestsPerMonth: 5,
      regularizationWindowDays: 7,
    };

    return prisma.attendancePolicy.create({
      data: {
        companyId,
        type: policyType,
        name: data.name,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
        config: configPayload as Prisma.InputJsonValue,
        punchInConfig: punchIn as Prisma.InputJsonValue,
        punchOutConfig: punchOut as Prisma.InputJsonValue,
        regularizationConfig: reg as Prisma.InputJsonValue,
      },
    });
  }

  public async update(companyId: string, id: string, data: UpdatePolicyRepoInput): Promise<AttendancePolicy> {
    const updateData: Prisma.AttendancePolicyUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue;
    if (data.punchInConfig !== undefined) updateData.punchInConfig = data.punchInConfig as Prisma.InputJsonValue;
    if (data.punchOutConfig !== undefined) updateData.punchOutConfig = data.punchOutConfig as Prisma.InputJsonValue;
    if (data.regularizationConfig !== undefined) updateData.regularizationConfig = data.regularizationConfig as Prisma.InputJsonValue;

    return prisma.attendancePolicy.update({
      where: { id },
      data: updateData,
    });
  }

  public async softDelete(companyId: string, id: string): Promise<AttendancePolicy> {
    return prisma.attendancePolicy.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  public async getPolicyAssignmentsCount(id: string) {
    const [departmentsCount, designationsCount, usersCount, genericAssignments] = await Promise.all([
      prisma.department.count({ where: { attendancePolicyId: id } }),
      prisma.designation.count({ where: { attendancePolicyId: id } }),
      prisma.user.count({ where: { attendancePolicyId: id, deletedAt: null } }),
      prisma.policyAssignment.findMany({ where: { policyId: id } }),
    ]);

    const genericDeptCount = genericAssignments.filter(a => a.targetType === PolicyTargetType.DEPARTMENT).length;
    const genericDesigCount = genericAssignments.filter(a => a.targetType === PolicyTargetType.DESIGNATION).length;
    const genericUserCount = genericAssignments.filter(a => a.targetType === PolicyTargetType.USER).length;

    const totalDepts = Math.max(departmentsCount, genericDeptCount);
    const totalDesigs = Math.max(designationsCount, genericDesigCount);
    const totalUsers = Math.max(usersCount, genericUserCount);

    return {
      departments: totalDepts,
      designations: totalDesigs,
      users: totalUsers,
      total: totalDepts + totalDesigs + totalUsers,
    };
  }

  public async getCompanyDefaultPolicy(companyId: string, type: PolicyType = PolicyType.ATTENDANCE): Promise<AttendancePolicy | null> {
    // 1. Check generic policy assignments first
    const companyAssignment = await prisma.policyAssignment.findFirst({
      where: {
        companyId,
        policyType: type,
        targetType: PolicyTargetType.COMPANY,
        targetId: companyId,
      },
      include: {
        policy: true,
      },
    });

    if (companyAssignment?.policy && companyAssignment.policy.isActive && !companyAssignment.policy.deletedAt) {
      return companyAssignment.policy;
    }

    // 2. If ATTENDANCE, check company.defaultAttendancePolicyId
    if (type === PolicyType.ATTENDANCE) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { defaultAttendancePolicyId: true },
      });
      if (company?.defaultAttendancePolicyId) {
        return prisma.attendancePolicy.findUnique({
          where: { id: company.defaultAttendancePolicyId },
        });
      }
    }

    return null;
  }
}
