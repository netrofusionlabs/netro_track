import { prisma } from '../../shared/config/prisma';
import { User, Role } from '@prisma/client';

export class EmployeeRepository {
  public async findMany(companyId: string, filter?: { managerId?: string }): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        companyId,
        managerId: filter?.managerId,
        deletedAt: null
      },
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(companyId: string, id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      }
    });
  }

  public async findByEmployeeId(companyId: string, employeeId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        companyId,
        employeeId: {
          equals: employeeId,
          mode: 'insensitive'
        },
        deletedAt: null
      },
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      }
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        },
        deletedAt: null
      },
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      }
    });
  }

  public async create(data: {
    companyId: string;
    employeeId: string;
    name: string;
    email?: string | null;
    passwordHash: string;
    role: Role;
    managerId?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
  }): Promise<User> {
    return prisma.user.create({
      data,
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      }
    });
  }

  public async update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      email?: string | null;
      passwordHash?: string;
      role?: Role;
      managerId?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
      designationId?: string | null;
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id, companyId },
      data,
      include: {
        manager: true,
        branch: true,
        department: true,
        designation: true
      }
    });
  }

  public async softDelete(companyId: string, id: string): Promise<User> {
    return prisma.user.update({
      where: { id, companyId },
      data: { deletedAt: new Date() }
    });
  }
}
