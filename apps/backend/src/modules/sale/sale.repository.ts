import { prisma } from '../../shared/config/prisma';
import { Sale } from '@prisma/client';

export class SaleRepository {
  public async create(data: {
    companyId: string;
    userId: string;
    customerId: string;
    totalAmount: number;
    remarks?: string | null;
    items: Array<{ productId: string; quantity: number; price: number; totalPrice: number }>;
  }): Promise<Sale> {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          companyId: data.companyId,
          userId: data.userId,
          customerId: data.customerId,
          totalAmount: data.totalAmount,
          remarks: data.remarks,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.totalPrice
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          customer: true,
          user: true
        }
      });
      return sale;
    });
  }

  public async findMany(companyId: string, filter?: { userId?: string; userIds?: string[] }): Promise<Sale[]> {
    return prisma.sale.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.userIds ? { userId: { in: filter.userIds } } : {})
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(companyId: string, id: string): Promise<Sale | null> {
    return prisma.sale.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        user: true
      }
    });
  }

  public async findTodayByUser(
    companyId: string,
    userId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<Sale[]> {
    return prisma.sale.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        user: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
