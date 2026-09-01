import { DepartmentRepository } from './department.repository';
import { CreateDepartmentPayload, UpdateDepartmentPayload } from '@netrotrack/shared';
import { AppError } from '../../shared/errors/AppError';
import { prisma } from '../../shared/config/prisma';

export class DepartmentService {
  private repository: DepartmentRepository;

  constructor() {
    this.repository = new DepartmentRepository();
  }

  async getDepartments(companyId: string) {
    return this.repository.findAll(companyId);
  }

  async getDepartment(id: string, companyId: string) {
    const dept = await this.repository.findById(id, companyId);
    if (!dept) {
      throw new AppError('DEPARTMENT_NOT_FOUND', 'Department not found', 404);
    }
    return dept;
  }

  async createDepartment(companyId: string, data: CreateDepartmentPayload) {
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId, deletedAt: null },
      });
      if (!branch) {
        throw new AppError('BRANCH_NOT_FOUND', 'The specified branch was not found or belongs to another company.', 404);
      }
    }
    return this.repository.create(companyId, data);
  }

  async updateDepartment(id: string, companyId: string, data: UpdateDepartmentPayload) {
    const dept = await this.getDepartment(id, companyId);

    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId, deletedAt: null },
      });
      if (!branch) {
        throw new AppError('BRANCH_NOT_FOUND', 'The specified branch was not found or belongs to another company.', 404);
      }
    }

    return this.repository.update(dept.id, companyId, data);
  }

  async deleteDepartment(id: string, companyId: string) {
    const dept = await this.getDepartment(id, companyId);
    try {
      await this.repository.delete(dept.id, companyId);
    } catch (error: any) {
      throw new AppError('DEPARTMENT_DELETE_FAILED', error.message, 400);
    }
    return { success: true };
  }
}
