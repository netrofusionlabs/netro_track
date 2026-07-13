import { EmployeeRepository } from './employee.repository';
import { AppError } from '../../shared/errors/AppError';
import { User, Role } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';
import argon2 from 'argon2';

export class EmployeeService {
  private employeeRepository = new EmployeeRepository();

  public async getAllEmployees(companyId: string, filter?: { managerId?: string }): Promise<User[]> {
    return this.employeeRepository.findMany(companyId, filter);
  }

  public async getEmployeeById(companyId: string, id: string): Promise<User> {
    const employee = await this.employeeRepository.findById(companyId, id);
    if (!employee) {
      throw new AppError('EMPLOYEE_NOT_FOUND', 'Employee not found', 404);
    }
    return employee;
  }

  public async createEmployee(
    companyId: string,
    data: {
      employeeId: string;
      name: string;
      email?: string | null;
      password?: string;
      role: Role;
      managerId?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
      designationId?: string | null;
    }
  ): Promise<User> {
    // 1. Verify employeeId uniqueness within company
    const existingEmpId = await this.employeeRepository.findByEmployeeId(companyId, data.employeeId);
    if (existingEmpId) {
      throw new AppError('EMPLOYEE_ID_ALREADY_EXISTS', 'Employee ID already registered in this company', 409);
    }

    // 2. Verify email uniqueness globally if provided
    if (data.email) {
      const existingEmail = await this.employeeRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'Email address already registered', 409);
      }
    }

    // 3. Verify corporate hierarchy IDs belong to the company
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId, deletedAt: null }
      });
      if (!branch) {
        throw new AppError('BRANCH_NOT_FOUND', 'Branch not found or belongs to another company', 400);
      }
    }

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, companyId, deletedAt: null }
      });
      if (!dept) {
        throw new AppError('DEPARTMENT_NOT_FOUND', 'Department not found or belongs to another company', 400);
      }
      if (dept.branchId && data.branchId && dept.branchId !== data.branchId) {
        throw new AppError('INVALID_DEPARTMENT_BRANCH', 'Department does not belong to the selected branch', 400);
      }
    }

    if (data.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: data.designationId, companyId, deletedAt: null }
      });
      if (!designation) {
        throw new AppError('DESIGNATION_NOT_FOUND', 'Designation not found or belongs to another company', 400);
      }
    }

    // 4. Hash password (default to 'Password123!' if none provided)
    const rawPassword = data.password || 'Password123!';
    const passwordHash = await argon2.hash(rawPassword);

    return this.employeeRepository.create({
      companyId,
      employeeId: data.employeeId,
      name: data.name,
      email: data.email || null,
      passwordHash,
      role: data.role,
      managerId: data.managerId || null,
      branchId: data.branchId || null,
      departmentId: data.departmentId || null,
      designationId: data.designationId || null
    });
  }

  public async updateEmployee(
    companyId: string,
    id: string,
    data: {
      name?: string;
      email?: string | null;
      password?: string;
      role?: Role;
      managerId?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
      designationId?: string | null;
    }
  ): Promise<User> {
    const existing = await this.getEmployeeById(companyId, id);

    const updatePayload: {
      name?: string;
      email?: string | null;
      passwordHash?: string;
      role?: Role;
      managerId?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
      designationId?: string | null;
    } = {
      name: data.name,
      email: data.email,
      role: data.role,
      managerId: data.managerId,
      branchId: data.branchId,
      departmentId: data.departmentId,
      designationId: data.designationId
    };

    // 1. Validate email uniqueness if changing
    if (data.email) {
      const existingEmail = await this.employeeRepository.findByEmail(data.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'Email address already registered', 409);
      }
    }

    // 2. Validate corporate hierarchy IDs belong to the company if changing
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId, deletedAt: null }
      });
      if (!branch) {
        throw new AppError('BRANCH_NOT_FOUND', 'Branch not found or belongs to another company', 400);
      }
    }

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, companyId, deletedAt: null }
      });
      if (!dept) {
        throw new AppError('DEPARTMENT_NOT_FOUND', 'Department not found or belongs to another company', 400);
      }
      const finalBranchId = data.branchId !== undefined ? data.branchId : existing.branchId;
      if (dept.branchId && finalBranchId && dept.branchId !== finalBranchId) {
        throw new AppError('INVALID_DEPARTMENT_BRANCH', 'Department does not belong to the selected branch', 400);
      }
    }

    if (data.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: data.designationId, companyId, deletedAt: null }
      });
      if (!designation) {
        throw new AppError('DESIGNATION_NOT_FOUND', 'Designation not found or belongs to another company', 400);
      }
    }

    // 3. Hash password if changing
    if (data.password) {
      updatePayload.passwordHash = await argon2.hash(data.password);
    }

    return this.employeeRepository.update(companyId, id, updatePayload);
  }

  public async deleteEmployee(companyId: string, id: string): Promise<User> {
    await this.getEmployeeById(companyId, id);
    return this.employeeRepository.softDelete(companyId, id);
  }
}
