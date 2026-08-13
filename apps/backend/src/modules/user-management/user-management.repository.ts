import { prisma } from '../../shared/config/prisma';
import { User, Role, UserStatus, Prisma } from '@prisma/client';

export interface UserFilterOptions {
  companyId?: string;
  role?: Role;
  status?: UserStatus;
  managerId?: string | null;
  search?: string;
  tab?: 'ALL' | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'UNASSIGNED';
  page?: number;
  pageSize?: number;
  allowedRoles?: Role[];
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export class UserManagementRepository {
  public async findUsersByCompany(companyId: string, filters?: UserFilterOptions): Promise<PaginatedResult<User>> {
    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    const targetCompanyId = filters?.companyId || companyId;
    if (targetCompanyId) {
      whereClause.companyId = targetCompanyId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.role) {
      whereClause.role = filters.role;
    } else if (filters?.allowedRoles && filters.allowedRoles.length > 0) {
      whereClause.role = { in: filters.allowedRoles };
    }

    // Tab level filtering on backend
    if (filters?.tab) {
      switch (filters.tab) {
        case 'SUPER_ADMIN':
          whereClause.role = { in: [Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN] };
          break;
        case 'COMPANY_ADMIN':
          whereClause.role = Role.COMPANY_ADMIN;
          break;
        case 'HR':
          whereClause.role = Role.HR;
          break;
        case 'MANAGER':
          whereClause.role = Role.MANAGER;
          break;
        case 'EMPLOYEE':
          whereClause.role = Role.EMPLOYEE;
          // If a managerId scope is set (e.g. actor is MANAGER), restrict to that manager's employees only.
          // Otherwise show all assigned employees (managerId != null).
          whereClause.managerId = filters.managerId !== undefined
            ? filters.managerId
            : { not: null };
          break;
        case 'UNASSIGNED':
          whereClause.role = Role.EMPLOYEE;
          whereClause.managerId = null;
          break;
      }
    }

    // Apply managerId scope for non-tab queries (e.g. Manager viewing "All Users")
    if (filters?.managerId !== undefined && !filters?.tab) {
      whereClause.managerId = filters.managerId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      if (q.length > 0) {
        whereClause.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const [items, totalItems] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        include: {
          company: {
            select: { id: true, name: true, code: true },
          },
          manager: {
            select: { id: true, name: true, employeeId: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
          designation: {
            select: { id: true, name: true },
          },
          _count: {
            select: { subordinates: { where: { deletedAt: null } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  public async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        manager: {
          select: { id: true, name: true, employeeId: true, email: true, role: true },
        },
        branch: true,
        department: true,
        designation: true,
        _count: {
          select: { subordinates: { where: { deletedAt: null } } },
        },
      },
    });
  }

  public async findSubordinates(managerId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        managerId,
        deletedAt: null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  public async countSubordinates(managerId: string): Promise<number> {
    return prisma.user.count({
      where: {
        managerId,
        deletedAt: null,
      },
    });
  }

  /**
   * Returns active users whose rank is strictly above the given target role.
   * Used to populate the "Reporting To" supervisor picker when creating a user.
   * e.g. targetRole=MANAGER → returns HR + COMPANY_ADMIN users
   *      targetRole=HR      → returns COMPANY_ADMIN users
   *      targetRole=EMPLOYEE → returns MANAGER users (same as findManagersByCompany)
   */
  public async findSupervisorsByCompany(
    companyId: string,
    targetRole: string,
    search?: string,
    excludeUserId?: string,
  ): Promise<User[]> {
    const { ROLE_RANK } = require('../../shared/services/authorization.service');
    const targetRank: number = ROLE_RANK[targetRole] ?? 0;

    const supervisorRoles = (Object.values(Role) as string[]).filter(
      (r) => r !== 'FIELD_EMPLOYEE' && (ROLE_RANK[r] ?? 0) > targetRank
    ) as Role[];

    if (supervisorRoles.length === 0) return [];

    const where: Prisma.UserWhereInput = {
      companyId,
      role: { in: supervisorRoles },
      status: UserStatus.ACTIVE,
      deletedAt: null,
      // Never allow a user to appear as their own supervisor
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    };

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { employeeId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        employeeId: true,
        role: true,
        email: true,
        designation: { select: { name: true } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 30,
    }) as any as User[];
  }

  public async findManagersByCompany(companyId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        companyId,
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { subordinates: { where: { deletedAt: null } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  public async findUnassignedEmployees(companyId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        companyId,
        role: Role.EMPLOYEE,
        managerId: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  public async countMasterSuperAdmins(): Promise<number> {
    return prisma.user.count({
      where: {
        role: Role.MASTER_SUPER_ADMIN,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.UserCreateInput, tx?: PrismaTransaction): Promise<User> {
    const client = tx || prisma;
    return client.user.create({
      data,
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true,
      },
    });
  }

  public async update(id: string, data: Prisma.UserUpdateInput, tx?: PrismaTransaction): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data,
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true,
      },
    });
  }

  public async updateUserStatus(id: string, status: UserStatus, tx?: PrismaTransaction): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: { status },
    });
  }

  public async bulkUpdateManagerId(
    employeeIds: string[],
    newManagerId: string | null,
    tx?: PrismaTransaction
  ): Promise<void> {
    const client = tx || prisma;
    await client.user.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: {
        managerId: newManagerId,
      },
    });
  }
}
