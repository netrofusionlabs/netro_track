import { prisma } from '../../shared/config/prisma';
import { CreateDepartmentPayload, UpdateDepartmentPayload } from '@netrotrack/shared';

export class DepartmentRepository {
  async findAll(companyId: string) {
    return prisma.department.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        attendancePolicy: { select: { id: true, name: true } },
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
    });
  }

  async findById(id: string, companyId: string) {
    return prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        attendancePolicy: { select: { id: true, name: true } },
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
    });
  }

  async create(companyId: string, data: CreateDepartmentPayload) {
    return prisma.department.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: UpdateDepartmentPayload) {
    return prisma.department.update({
      where: { id_companyId: { id, companyId } } as any,
      data,
    }).catch(() => {
      return prisma.$transaction(async (tx) => {
        const dept = await tx.department.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!dept) throw new Error('Not found');
        return tx.department.update({ where: { id }, data });
      });
    });
  }

  async delete(id: string, companyId: string) {
    const dept = await prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
    });

    if (!dept) return null;

    if (dept._count.users > 0) {
      throw new Error(`Cannot delete department. Reassign ${dept._count.users} users first.`);
    }

    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
