import { prisma } from '../../shared/config/prisma';
import { CompanyRole, Prisma } from '@prisma/client';
import { CreateCompanyRoleInput, UpdateCompanyRoleInput } from '@netrotrack/shared';

export class RoleHierarchyRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  public async findCompanyRoles(companyId: string): Promise<any[]> {
    return prisma.companyRole.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { rank: 'asc' },
      include: {
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
    });
  }

  public async findCompanyRoleById(companyId: string, roleId: string): Promise<any | null> {
    return prisma.companyRole.findFirst({
      where: { id: roleId, companyId, deletedAt: null },
      include: {
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
    });
  }

  public async findCompanyRoleByCode(companyId: string, code: string): Promise<CompanyRole | null> {
    return prisma.companyRole.findFirst({
      where: { companyId, code: { equals: code, mode: 'insensitive' }, deletedAt: null },
    });
  }

  public async findRankInUse(companyId: string, rank: number, excludeId?: string): Promise<boolean> {
    const existing = await prisma.companyRole.findFirst({
      where: {
        companyId,
        rank,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return !!existing;
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  public async createCompanyRole(companyId: string, data: CreateCompanyRoleInput): Promise<CompanyRole> {
    return prisma.companyRole.create({
      data: {
        companyId,
        name: data.name,
        code: data.code.toUpperCase(),
        rank: data.rank,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  public async updateCompanyRole(
    companyId: string,
    roleId: string,
    data: UpdateCompanyRoleInput
  ): Promise<CompanyRole> {
    return prisma.companyRole.update({
      where: { id: roleId },
      data: {
        name: data.name,
        rank: data.rank,
        description: data.description !== undefined ? data.description : undefined,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }

  public async deleteCompanyRole(companyId: string, roleId: string): Promise<CompanyRole> {
    return prisma.companyRole.update({
      where: { id: roleId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  /** Atomic reorder: replaces ranks for the specified role IDs within one company. */
  public async reorderRanks(
    companyId: string,
    newOrder: Array<{ id: string; rank: number }>
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Use a temporary offset to avoid unique constraint collisions during reorder
      const TEMP_OFFSET = 10000;

      // Step 1: move all to temp ranks
      for (const item of newOrder) {
        await tx.companyRole.update({
          where: { id: item.id },
          data: { rank: item.rank + TEMP_OFFSET, updatedAt: new Date() },
        });
      }

      // Step 2: set final ranks
      for (const item of newOrder) {
        await tx.companyRole.update({
          where: { id: item.id },
          data: { rank: item.rank, updatedAt: new Date() },
        });
      }
    });
  }

  // ── Approval History ──────────────────────────────────────────────────────────

  public async findApprovalActions(
    companyId: string,
    requestType: string,
    requestId: string
  ): Promise<any[]> {
    return prisma.approvalAction.findMany({
      where: { companyId, requestType, requestId },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async createApprovalAction(data: {
    companyId: string;
    requestType: string;
    requestId: string;
    action: string;
    remarks?: string | null;
    approverId: string;
    approverName: string;
    approverRole: string;
    approverRoleRank?: number | null;
    approverCompanyRoleName?: string | null;
    requesterId: string;
    requesterName: string;
    requesterRole: string;
    requesterRoleRank?: number | null;
    requesterCompanyRoleName?: string | null;
  }): Promise<void> {
    await prisma.approvalAction.create({ data });
  }
}
