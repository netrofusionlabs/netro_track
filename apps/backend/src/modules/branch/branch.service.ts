import { BranchRepository } from './branch.repository';
import { CreateBranchPayload, UpdateBranchPayload } from '@netrotrack/shared';
import { AppError } from '../../shared/errors/AppError';

export class BranchService {
  private repository: BranchRepository;

  constructor() {
    this.repository = new BranchRepository();
  }

  async getBranches(companyId: string) {
    return this.repository.findAll(companyId);
  }

  async getBranch(id: string, companyId: string) {
    const branch = await this.repository.findById(id, companyId);
    if (!branch) {
      throw new AppError('BRANCH_NOT_FOUND', 'Branch not found', 404);
    }
    return branch;
  }

  async createBranch(companyId: string, data: CreateBranchPayload) {
    return this.repository.create(companyId, data);
  }

  async updateBranch(id: string, companyId: string, data: UpdateBranchPayload) {
    const branch = await this.getBranch(id, companyId);
    return this.repository.update(branch.id, companyId, data);
  }

  async deleteBranch(id: string, companyId: string) {
    const branch = await this.getBranch(id, companyId);
    try {
      await this.repository.delete(branch.id, companyId);
    } catch (error: any) {
      throw new AppError('BRANCH_DELETE_FAILED', error.message, 400);
    }
    return { success: true };
  }
}
