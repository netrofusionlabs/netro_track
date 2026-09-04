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
        entitlements: {
          where: { isEnabled: true },
          include: {
            capability: true,
          },
        },
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
        entitlements: {
          where: { isEnabled: true },
          include: {
            capability: true,
          },
        },
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

      // 2. Create Company Admin User (temporarily without companyRoleId — assigned below)
      const adminUser = await tx.user.create({
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

      // 2a. Create default CompanyRole hierarchy for this company
      const companyAdminRole = await tx.companyRole.create({
        data: {
          companyId: company.id,
          name: 'Company Admin',
          code: 'COMPANY_ADMIN',
          rank: 1,
          isSystem: true,
        },
      });
      await tx.companyRole.createMany({
        data: [
          { companyId: company.id, name: 'HR',       code: 'HR',       rank: 2, isSystem: false },
          { companyId: company.id, name: 'Manager',   code: 'MANAGER',  rank: 3, isSystem: false },
          { companyId: company.id, name: 'Employee',  code: 'EMPLOYEE', rank: 5, isSystem: false },
        ],
        skipDuplicates: true,
      });

      // 2b. Assign the admin user to the Company Admin role
      await tx.user.update({
        where: { id: adminUser.id },
        data: { companyRoleId: companyAdminRole.id },
      });

      // 3. Create Dynamic Capability Entitlements
      if (payload.capabilityIds && payload.capabilityIds.length > 0) {
        const selectedCaps = await tx.systemCapability.findMany({
          where: { id: { in: payload.capabilityIds }, isActive: true },
          include: { children: { include: { children: true } } },
        });

        const allCapIdsToEntitle = new Set<string>();
        for (const cap of selectedCaps) {
          allCapIdsToEntitle.add(cap.id);
          if (cap.parentId) allCapIdsToEntitle.add(cap.parentId);
          if (cap.children) {
            for (const sub of cap.children) {
              allCapIdsToEntitle.add(sub.id);
              if (sub.children) {
                for (const act of sub.children) {
                  allCapIdsToEntitle.add(act.id);
                }
              }
            }
          }
        }

        await tx.companyEntitlement.createMany({
          data: Array.from(allCapIdsToEntitle).map((capId) => ({
            companyId: company.id,
            capabilityId: capId,
            isEnabled: true,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Create Default HQ Branch
      const hqBranchName = payload.company.city ? `${payload.company.city} HQ` : 'Headquarters';
      const hqAddress = [payload.company.addressLine1, payload.company.addressLine2, payload.company.city, payload.company.state, payload.company.zipCode]
        .filter(Boolean)
        .join(', ');

      await tx.branch.create({
        data: {
          companyId: company.id,
          name: hqBranchName,
          address: hqAddress || null,
          isHq: true,
          isActive: true,
        },
      });

      return company;
    }, { maxWait: 10000, timeout: 25000 });
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

      if (payload.capabilityIds !== undefined) {
        // Disable existing entitlements
        await tx.companyEntitlement.updateMany({
          where: { companyId: id },
          data: { isEnabled: false },
        });

        if (payload.capabilityIds.length > 0) {
          const selectedCaps = await tx.systemCapability.findMany({
            where: { id: { in: payload.capabilityIds }, isActive: true },
            include: { children: { include: { children: true } } },
          });

          const allCapIdsToEntitle = new Set<string>();
          for (const cap of selectedCaps) {
            allCapIdsToEntitle.add(cap.id);
            if (cap.parentId) allCapIdsToEntitle.add(cap.parentId);
            if (cap.children) {
              for (const sub of cap.children) {
                allCapIdsToEntitle.add(sub.id);
                if (sub.children) {
                  for (const act of sub.children) {
                    allCapIdsToEntitle.add(act.id);
                  }
                }
              }
            }
          }

          for (const capId of allCapIdsToEntitle) {
            await tx.companyEntitlement.upsert({
              where: {
                companyId_capabilityId: {
                  companyId: id,
                  capabilityId: capId,
                },
              },
              update: { isEnabled: true },
              create: {
                companyId: id,
                capabilityId: capId,
                isEnabled: true,
              },
            });
          }
        }
      }

      // 3. Auto-generate HQ branch if the company has NO branches (for legacy companies)
      const branchCount = await tx.branch.count({ where: { companyId: id, deletedAt: null } });
      if (branchCount === 0) {
        const hqBranchName = payload.city ? `${payload.city} HQ` : 'Headquarters';
        const hqAddress = [payload.addressLine1, payload.addressLine2, payload.city, payload.state, payload.zipCode]
          .filter(Boolean)
          .join(', ');

        await tx.branch.create({
          data: {
            companyId: id,
            name: hqBranchName,
            address: hqAddress || null,
            isHq: true,
            isActive: true,
          },
        });
      }

      return company;
    }, { timeout: 15000 });
  }

  public async softDelete(id: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
