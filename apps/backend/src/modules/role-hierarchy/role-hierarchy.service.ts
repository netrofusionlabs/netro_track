import { Role } from '@prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { RoleHierarchyRepository } from './role-hierarchy.repository';
import {
  CreateCompanyRoleInput,
  UpdateCompanyRoleInput,
  ReorderCompanyRolesInput,
  CompanyRoleDto,
  RoleHierarchyConfig,
} from '@netrotrack/shared';

/** Roles that are allowed to manage company hierarchy (no special permission slug needed). */
const CAN_MANAGE_ROLES: ReadonlySet<string> = new Set([
  Role.COMPANY_ADMIN,
  Role.SUPER_ADMIN,
  Role.MASTER_SUPER_ADMIN,
]);

export class RoleHierarchyService {
  private readonly repo = new RoleHierarchyRepository();

  // ── Queries ────────────────────────────────────────────────────────────────

  public async getCompanyRoles(companyId: string): Promise<CompanyRoleDto[]> {
    const rows = await this.repo.findCompanyRoles(companyId);
    return rows.map(this.toDto);
  }

  public async getCompanyRoleById(companyId: string, roleId: string): Promise<CompanyRoleDto> {
    const role = await this.repo.findCompanyRoleById(companyId, roleId);
    if (!role) {
      throw new AppError('ROLE_NOT_FOUND', 'Company role not found', 404);
    }
    return this.toDto(role);
  }

  /**
   * Returns the role hierarchy configuration for the mobile/web configuration payload.
   * Only includes active roles, sorted by rank.
   */
  public async getRoleHierarchyConfig(companyId: string): Promise<RoleHierarchyConfig> {
    const roles = await this.repo.findCompanyRoles(companyId);
    return {
      enabled: true,
      roles: roles
        .filter((r) => r.isActive && !r.deletedAt)
        .map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          rank: r.rank,
          isSystem: r.isSystem,
        })),
    };
  }

  // ── Commands ────────────────────────────────────────────────────────────────

  public async createRole(
    actorRole: string,
    companyId: string,
    data: CreateCompanyRoleInput
  ): Promise<CompanyRoleDto> {
    this.assertCanManage(actorRole);

    // Prevent duplicate codes
    const existing = await this.repo.findCompanyRoleByCode(companyId, data.code);
    if (existing) {
      throw new AppError('ROLE_CODE_EXISTS', `Role code "${data.code}" already exists in this company`, 409);
    }

    // Prevent rank collision
    const rankInUse = await this.repo.findRankInUse(companyId, data.rank);
    if (rankInUse) {
      throw new AppError('RANK_ALREADY_IN_USE', `Rank ${data.rank} is already assigned to another role`, 409);
    }

    // Rank 1 is reserved for the system Company Admin role
    if (data.rank === 1) {
      throw new AppError(
        'RANK_RESERVED',
        'Rank 1 is reserved for the Company Admin role',
        400
      );
    }

    const role = await this.repo.createCompanyRole(companyId, data);
    return this.toDto(role);
  }

  public async updateRole(
    actorRole: string,
    companyId: string,
    roleId: string,
    data: UpdateCompanyRoleInput
  ): Promise<CompanyRoleDto> {
    this.assertCanManage(actorRole);

    const existing = await this.repo.findCompanyRoleById(companyId, roleId);
    if (!existing) {
      throw new AppError('ROLE_NOT_FOUND', 'Company role not found', 404);
    }

    // System roles (Company Admin) cannot have their rank changed
    if (existing.isSystem && data.rank !== undefined && data.rank !== existing.rank) {
      throw new AppError(
        'CANNOT_CHANGE_SYSTEM_ROLE_RANK',
        'The Company Admin role rank cannot be changed — it must always be Rank 1',
        400
      );
    }

    // Check rank uniqueness (excluding self)
    if (data.rank !== undefined) {
      const rankInUse = await this.repo.findRankInUse(companyId, data.rank, roleId);
      if (rankInUse) {
        throw new AppError('RANK_ALREADY_IN_USE', `Rank ${data.rank} is already assigned to another role`, 409);
      }
      if (data.rank === 1 && !existing.isSystem) {
        throw new AppError('RANK_RESERVED', 'Rank 1 is reserved for the Company Admin role', 400);
      }
    }

    const updated = await this.repo.updateCompanyRole(companyId, roleId, data);
    return this.toDto(updated);
  }

  public async deleteRole(
    actorRole: string,
    companyId: string,
    roleId: string
  ): Promise<{ message: string }> {
    this.assertCanManage(actorRole);

    const existing = await this.repo.findCompanyRoleById(companyId, roleId);
    if (!existing) {
      throw new AppError('ROLE_NOT_FOUND', 'Company role not found', 404);
    }

    if (existing.isSystem) {
      throw new AppError(
        'CANNOT_DELETE_SYSTEM_ROLE',
        'The Company Admin role is a system role and cannot be deleted',
        400
      );
    }

    if (existing._count?.users > 0) {
      throw new AppError(
        'ROLE_HAS_USERS',
        `Cannot delete role "${existing.name}" because ${existing._count.users} user(s) are assigned to it. Reassign them first.`,
        409
      );
    }

    await this.repo.deleteCompanyRole(companyId, roleId);
    return { message: `Role "${existing.name}" has been deleted` };
  }

  public async reorderRoles(
    actorRole: string,
    companyId: string,
    input: ReorderCompanyRolesInput
  ): Promise<CompanyRoleDto[]> {
    this.assertCanManage(actorRole);

    // Validate: fetch all current roles for this company
    const currentRoles = await this.repo.findCompanyRoles(companyId);
    const currentIds = new Set(currentRoles.map((r) => r.id));

    for (const item of input.roles) {
      if (!currentIds.has(item.id)) {
        throw new AppError('ROLE_NOT_FOUND', `Role ${item.id} not found in this company`, 404);
      }

      // Find the existing role and guard system roles
      const existing = currentRoles.find((r) => r.id === item.id)!;
      if (existing.isSystem && item.rank !== 1) {
        throw new AppError(
          'CANNOT_CHANGE_SYSTEM_ROLE_RANK',
          'The Company Admin role must remain at Rank 1',
          400
        );
      }
      if (!existing.isSystem && item.rank === 1) {
        throw new AppError('RANK_RESERVED', 'Rank 1 is reserved for the Company Admin role', 400);
      }
    }

    // Detect duplicate ranks in the submitted list
    const newRanks = input.roles.map((r) => r.rank);
    if (new Set(newRanks).size !== newRanks.length) {
      throw new AppError('DUPLICATE_RANKS', 'Two or more roles in the reorder request share the same rank', 400);
    }

    await this.repo.reorderRanks(companyId, input.roles);
    return this.getCompanyRoles(companyId);
  }

  // ── Idempotent company bootstrap ──────────────────────────────────────────

  /**
   * Ensures the COMPANY_ADMIN system role exists for the given company.
   * Called automatically when a company is created.
   */
  public async ensureCompanyAdminRole(companyId: string): Promise<string> {
    const existing = await this.repo.findCompanyRoleByCode(companyId, 'COMPANY_ADMIN');
    if (existing) return existing.id;

    const role = await this.repo.createCompanyRole(companyId, {
      name: 'Company Admin',
      code: 'COMPANY_ADMIN',
      rank: 1,
      isActive: true,
    });

    // Mark as system role
    await this.repo.updateCompanyRole(companyId, role.id, {});
    // We need to set isSystem=true directly via a raw update since our DTO doesn't expose it
    // This is done at DB level via the migration backfill; here we patch via prisma directly
    const { prisma } = await import('../../shared/config/prisma');
    await prisma.companyRole.update({
      where: { id: role.id },
      data: { isSystem: true },
    });

    return role.id;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertCanManage(actorRole: string): void {
    if (!CAN_MANAGE_ROLES.has(actorRole)) {
      throw new AppError(
        'FORBIDDEN',
        'Only Company Admin, Super Admin, or Master Super Admin can manage role hierarchy',
        403
      );
    }
  }

  private toDto(row: any): CompanyRoleDto {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      code: row.code,
      rank: row.rank,
      description: row.description ?? null,
      isSystem: row.isSystem,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      userCount: row._count?.users ?? 0,
    };
  }
}
