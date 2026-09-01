import { prisma } from '../../shared/config/prisma';
import { CreateBranchPayload, UpdateBranchPayload } from '@netrotrack/shared';

export class BranchRepository {
  async findAll(companyId: string) {
    return prisma.branch.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { departments: { where: { deletedAt: null } }, users: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findById(id: string, companyId: string) {
    return prisma.branch.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: {
          select: { departments: { where: { deletedAt: null } }, users: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async create(companyId: string, data: CreateBranchPayload) {
    return prisma.$transaction(async (tx) => {
      if (data.isHq) {
        await tx.branch.updateMany({ where: { companyId }, data: { isHq: false } });
      }
      return tx.branch.create({
        data: {
          ...data,
          companyId,
        },
      });
    });
  }

  async update(id: string, companyId: string, data: UpdateBranchPayload) {
    return prisma.$transaction(async (tx) => {
      if (data.isHq) {
        await tx.branch.updateMany({ where: { companyId, id: { not: id } }, data: { isHq: false } });
      }
      return tx.branch.update({
        where: { id_companyId: { id, companyId } } as any, // fallback if composite unique is missing
        data,
      }).catch(async () => {
        // If no unique constraint on id+companyId, do an updateMany and return updated record
        const branch = await tx.branch.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!branch) throw new Error('Not found');
        return tx.branch.update({ where: { id }, data });
      });
    });
  }

  async delete(id: string, companyId: string) {
    // Check if there are active users or departments
    const branch = await prisma.branch.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: {
          select: { departments: { where: { deletedAt: null } }, users: { where: { deletedAt: null } } },
        },
      },
    });

    if (!branch) return null;

    if (branch._count.users > 0 || branch._count.departments > 0) {
      throw new Error(`Cannot delete branch. Reassign ${branch._count.users} users and ${branch._count.departments} departments first.`);
    }

    return prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
