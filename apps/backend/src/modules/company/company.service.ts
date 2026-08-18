import { CompanyRepository } from './company.repository';
import { AppError } from '../../shared/errors/AppError';
import { Company } from '@prisma/client';
import { CreateCompanyWizardInput, UpdateCompanyInput } from '@netrotrack/shared';
import * as argon2 from 'argon2';
import { prisma } from '../../shared/config/prisma';

import { StorageService } from '../../shared/services/storage.service';

export class CompanyService {
  private companyRepository = new CompanyRepository();

  public async getAllCompanies(): Promise<any[]> {
    const companies = await this.companyRepository.findMany();
    const storageService = StorageService.getInstance();

    return companies.map((c) => ({
      ...c,
      companyLogoUrl: c.logoFile?.objectKey ? storageService.getPublicUrl(c.logoFile.objectKey) : null,
    }));
  }

  public async getCompanyById(id: string): Promise<any> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    const storageService = StorageService.getInstance();
    return {
      ...company,
      companyLogoUrl: company.logoFile?.objectKey ? storageService.getPublicUrl(company.logoFile.objectKey) : null,
    };
  }

  public async createCompany(data: { name: string; code: string; isGpsEnabled?: boolean }): Promise<Company> {
    const existing = await this.companyRepository.findByCode(data.code);
    if (existing) {
      throw new AppError('COMPANY_CODE_ALREADY_EXISTS', 'Company code already registered', 409);
    }
    return this.companyRepository.create(data);
  }

  public async createCompanyWizard(payload: CreateCompanyWizardInput): Promise<Company> {
    const existing = await this.companyRepository.findByCode(payload.company.code);
    if (existing) {
      throw new AppError('COMPANY_CODE_ALREADY_EXISTS', 'Company code already registered', 409);
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: payload.admin.email }
    });
    
    if (existingAdmin) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'Admin email is already registered', 409);
    }

    const adminPasswordHash = await argon2.hash(payload.admin.password);
    return this.companyRepository.createWizard(payload, adminPasswordHash);
  }

  public async updateCompany(id: string, payload: UpdateCompanyInput): Promise<Company> {
    await this.getCompanyById(id);

    if (payload.code) {
      const existing = await this.companyRepository.findByCode(payload.code);
      if (existing && existing.id !== id) {
        throw new AppError('COMPANY_CODE_ALREADY_EXISTS', 'Company code already registered', 409);
      }
    }

    return this.companyRepository.update(id, payload);
  }

  public async deleteCompany(id: string): Promise<Company> {
    const company = await this.getCompanyById(id);
    if (company.code.toUpperCase() === 'NETRO' || company.name.toLowerCase().includes('netrotrack')) {
      throw new AppError(
        'CANNOT_DELETE_MASTER_COMPANY',
        'The master platform company (NetroTrack) cannot be deleted',
        400
      );
    }
    return this.companyRepository.softDelete(id);
  }
}
