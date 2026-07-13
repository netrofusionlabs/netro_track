import { prisma } from '../../shared/config/prisma';
import { Product } from '@prisma/client';

export class ProductRepository {
  public async findMany(companyId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(companyId: string, id: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { id, companyId, deletedAt: null }
    });
  }

  public async create(data: {
    companyId: string;
    name: string;
    sku?: string | null;
    description?: string | null;
    unit?: string | null;
    price?: number | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }): Promise<Product> {
    return prisma.product.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        unit: data.unit,
        price: data.price,
        imageUrl: data.imageUrl,
        isActive: data.isActive
      }
    });
  }

  public async update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      sku?: string | null;
      description?: string | null;
      unit?: string | null;
      price?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
    }
  ): Promise<Product> {
    return prisma.product.update({
      where: { id, companyId },
      data
    });
  }

  public async softDelete(companyId: string, id: string): Promise<Product> {
    return prisma.product.update({
      where: { id, companyId },
      data: { deletedAt: new Date() }
    });
  }
}
