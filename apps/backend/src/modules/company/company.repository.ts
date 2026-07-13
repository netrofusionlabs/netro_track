import { prisma } from '../../shared/config/prisma';
import { Company } from '@prisma/client';

export class CompanyRepository {
  public async findMany(): Promise<Company[]> {
    return prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(id: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: { id, deletedAt: null }
    });
  }

  public async findByCode(code: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null }
    });
  }

  public async create(data: { name: string; code: string }): Promise<Company> {
    return prisma.company.create({
      data
    });
  }

  public async update(id: string, data: { name?: string; code?: string }): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data
    });
  }

  public async softDelete(id: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
