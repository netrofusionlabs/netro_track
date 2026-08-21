import { prisma } from '../../shared/config/prisma';
import { AttendancePolicy, Prisma } from '@prisma/client';
import { PunchConfig, RegularizationConfig } from '@netrotrack/shared';

export class AttendancePolicyRepository {
  public async findMany(companyId: string): Promise<AttendancePolicy[]> {
    return prisma.attendancePolicy.findMany({
      where: {
        companyId,
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

  public async create(companyId: string, data: {
    name: string;
    description?: string | null;
    isActive?: boolean;
    punchInConfig: PunchConfig;
    punchOutConfig: PunchConfig;
    regularizationConfig?: RegularizationConfig;
  }): Promise<AttendancePolicy> {
    return prisma.attendancePolicy.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
        punchInConfig: data.punchInConfig as Prisma.InputJsonValue,
        punchOutConfig: data.punchOutConfig as Prisma.InputJsonValue,
        regularizationConfig: data.regularizationConfig as Prisma.InputJsonValue,
      },
    });
  }

  public async update(companyId: string, id: string, data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    punchInConfig?: PunchConfig;
    punchOutConfig?: PunchConfig;
    regularizationConfig?: RegularizationConfig;
  }): Promise<AttendancePolicy> {
    return prisma.attendancePolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        punchInConfig: data.punchInConfig,
        punchOutConfig: data.punchOutConfig,
        regularizationConfig: data.regularizationConfig,
      },
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
    const [departmentsCount, designationsCount, usersCount] = await Promise.all([
      prisma.department.count({ where: { attendancePolicyId: id } }),
      prisma.designation.count({ where: { attendancePolicyId: id } }),
      prisma.user.count({ where: { attendancePolicyId: id, deletedAt: null } }),
    ]);

    return {
      departments: departmentsCount,
      designations: designationsCount,
      users: usersCount,
      total: departmentsCount + designationsCount + usersCount,
    };
  }

  public async getCompanyDefaultPolicy(companyId: string): Promise<AttendancePolicy | null> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultAttendancePolicyId: true },
    });
    if (!company?.defaultAttendancePolicyId) return null;

    return prisma.attendancePolicy.findUnique({
      where: { id: company.defaultAttendancePolicyId },
    });
  }

  public async setCompanyDefaultPolicy(companyId: string, policyId: string | null): Promise<void> {
    await prisma.company.update({
      where: { id: companyId },
      data: { defaultAttendancePolicyId: policyId },
    });
  }
}
