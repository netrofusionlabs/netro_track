import { CompanyRepository } from './company.repository';
import { AppError } from '../../shared/errors/AppError';
import { Company } from '@prisma/client';

export class CompanyService {
  private companyRepository = new CompanyRepository();

  public async getAllCompanies(): Promise<Company[]> {
    return this.companyRepository.findMany();
  }

  public async getCompanyById(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    return company;
  }

  public async createCompany(data: { name: string; code: string }): Promise<Company> {
    const existing = await this.companyRepository.findByCode(data.code);
    if (existing) {
      throw new AppError('COMPANY_CODE_ALREADY_EXISTS', 'Company code already registered', 409);
    }
    return this.companyRepository.create(data);
  }

  public async updateCompany(id: string, data: { name?: string; code?: string }): Promise<Company> {
    await this.getCompanyById(id);

    if (data.code) {
      const existing = await this.companyRepository.findByCode(data.code);
      if (existing && existing.id !== id) {
        throw new AppError('COMPANY_CODE_ALREADY_EXISTS', 'Company code already registered', 409);
      }
    }

    return this.companyRepository.update(id, data);
  }

  public async deleteCompany(id: string): Promise<Company> {
    await this.getCompanyById(id);
    return this.companyRepository.softDelete(id);
  }
}
