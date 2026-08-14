import { prisma } from '../../shared/config/prisma';
import { Company, ModuleType, Role, UserStatus } from '@prisma/client';
import { CreateCompanyWizardInput, UpdateCompanyInput } from '@netrotrack/shared';

export class CompanyRepository {
  public async findMany(): Promise<Company[]> {
    return prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            branches: { where: { deletedAt: null } },
            departments: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findById(id: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            branches: { where: { deletedAt: null } },
            departments: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  public async findByCode(code: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null },
    });
  }

  public async create(data: { name: string; code: string; isGpsEnabled?: boolean }): Promise<Company> {
    return prisma.company.create({
      data,
    });
  }

  public async createWizard(payload: CreateCompanyWizardInput, adminPasswordHash: string): Promise<Company> {
    return prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name: payload.company.name,
          code: payload.company.code,
          officialEmail: payload.company.officialEmail || null,
          country: payload.company.country || null,
          legalName: payload.company.legalName || null,
          industry: payload.company.industry || null,
          companyType: payload.company.companyType || null,
          website: payload.company.website || null,
          phone: payload.company.phone || null,
          isGpsEnabled: payload.modules.gps,
        }
      });

      // 2. Create Company Admin User
      // Generate a simple employeeId for the first admin, e.g., 'ADMIN-001'
      await tx.user.create({
        data: {
          companyId: company.id,
          employeeId: 'ADMIN-001',
          name: payload.admin.name,
          email: payload.admin.email,
          phone: payload.admin.mobile,
          passwordHash: adminPasswordHash,
          role: Role.COMPANY_ADMIN,
          status: UserStatus.ACTIVE,
          isGpsTracked: payload.modules.gps,
        }
      });

      // 3. Create Modules
      const modulesToCreate = [
        { module: ModuleType.ATTENDANCE, isEnabled: payload.modules.attendance },
        { module: ModuleType.LEAVE, isEnabled: payload.modules.leave },
        { module: ModuleType.SHIFT, isEnabled: payload.modules.shift },
        { module: ModuleType.GPS, isEnabled: payload.modules.gps },
        { module: ModuleType.PAYROLL, isEnabled: payload.modules.payroll },
        { module: ModuleType.EXPENSE, isEnabled: payload.modules.expense },
        { module: ModuleType.ASSET, isEnabled: payload.modules.asset },
        { module: ModuleType.PERFORMANCE, isEnabled: payload.modules.performance },
        { module: ModuleType.RECRUITMENT, isEnabled: payload.modules.recruitment },
      ];

      await tx.companyModule.createMany({
        data: modulesToCreate.map(m => ({
          companyId: company.id,
          module: m.module,
          isEnabled: m.isEnabled,
        }))
      });

      return company;
    });
  }

  public async update(id: string, payload: UpdateCompanyInput): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: {
        name: payload.name,
        code: payload.code,
        officialEmail: payload.officialEmail || null,
        country: payload.country || null,
        legalName: payload.legalName || null,
        industry: payload.industry || null,
        companyType: payload.companyType || null,
        website: payload.website || null,
        phone: payload.phone || null,
        isGpsEnabled: payload.isGpsEnabled,
        taxId: payload.taxId || null,
        registrationNumber: payload.registrationNumber || null,
        timezone: payload.timezone || null,
        currency: payload.currency || null,
        addressLine1: payload.addressLine1 || null,
        addressLine2: payload.addressLine2 || null,
        city: payload.city || null,
        state: payload.state || null,
        zipCode: payload.zipCode || null,
        employeeCount: payload.employeeCount || null,
      },
    });
  }

  public async softDelete(id: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
