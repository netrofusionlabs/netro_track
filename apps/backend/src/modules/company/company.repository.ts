import { prisma } from '../../shared/config/prisma';
import { Company, ModuleType, Role, UserStatus } from '@prisma/client';
import { CreateCompanyWizardInput, UpdateCompanyInput } from '@netrotrack/shared';

export class CompanyRepository {
  public async findMany(): Promise<any[]> {
    return prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        logoFile: true,
        modules: true,
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

  public async findById(id: string): Promise<any | null> {
    return prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        logoFile: true,
        modules: true,
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
      // 1. Create Company with ALL profile, location, and localization fields
      const company = await tx.company.create({
        data: {
          name: payload.company.name,
          code: payload.company.code,
          legalName: payload.company.legalName || null,
          industry: payload.company.industry || null,
          companyType: payload.company.companyType || null,
          employeeCount: payload.company.employeeCount || null,
          officialEmail: payload.company.officialEmail || null,
          phone: payload.company.phone || null,
          website: payload.company.website || null,
          addressLine1: payload.company.addressLine1 || null,
          addressLine2: payload.company.addressLine2 || null,
          city: payload.company.city || null,
          state: payload.company.state || null,
          zipCode: payload.company.zipCode || null,
          country: payload.company.country || 'India',
          timezone: payload.company.timezone || 'Asia/Kolkata',
          currency: payload.company.currency || 'INR',
          taxId: payload.company.taxId || null,
          registrationNumber: payload.company.registrationNumber || null,
          isGpsEnabled: payload.modules.gps,
        },
      });

      // 2. Create Company Admin User
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
        },
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
        data: modulesToCreate.map((m) => ({
          companyId: company.id,
          module: m.module,
          isEnabled: m.isEnabled,
        })),
      });

      return company;
    });
  }

  public async update(id: string, payload: UpdateCompanyInput): Promise<Company> {
    return prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id },
        data: {
          name: payload.name,
          code: payload.code,
          officialEmail: payload.officialEmail !== undefined ? (payload.officialEmail || null) : undefined,
          country: payload.country !== undefined ? (payload.country || null) : undefined,
          legalName: payload.legalName !== undefined ? (payload.legalName || null) : undefined,
          industry: payload.industry !== undefined ? (payload.industry || null) : undefined,
          companyType: payload.companyType !== undefined ? (payload.companyType || null) : undefined,
          website: payload.website !== undefined ? (payload.website || null) : undefined,
          phone: payload.phone !== undefined ? (payload.phone || null) : undefined,
          isGpsEnabled: payload.isGpsEnabled,
          taxId: payload.taxId !== undefined ? (payload.taxId || null) : undefined,
          registrationNumber: payload.registrationNumber !== undefined ? (payload.registrationNumber || null) : undefined,
          timezone: payload.timezone !== undefined ? (payload.timezone || null) : undefined,
          currency: payload.currency !== undefined ? (payload.currency || null) : undefined,
          addressLine1: payload.addressLine1 !== undefined ? (payload.addressLine1 || null) : undefined,
          addressLine2: payload.addressLine2 !== undefined ? (payload.addressLine2 || null) : undefined,
          city: payload.city !== undefined ? (payload.city || null) : undefined,
          state: payload.state !== undefined ? (payload.state || null) : undefined,
          zipCode: payload.zipCode !== undefined ? (payload.zipCode || null) : undefined,
          employeeCount: payload.employeeCount !== undefined ? (payload.employeeCount || null) : undefined,
        },
      });

      if (payload.modules) {
        for (const [modKey, isEnabled] of Object.entries(payload.modules)) {
          const modType = modKey.toUpperCase() as ModuleType;
          if (Object.values(ModuleType).includes(modType)) {
            const existing = await tx.companyModule.findFirst({
              where: { companyId: id, module: modType },
            });
            if (existing) {
              await tx.companyModule.update({
                where: { id: existing.id },
                data: { isEnabled: Boolean(isEnabled) },
              });
            } else {
              await tx.companyModule.create({
                data: {
                  companyId: id,
                  module: modType,
                  isEnabled: Boolean(isEnabled),
                },
              });
            }
          }
        }
      }

      return company;
    });
  }

  public async softDelete(id: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
