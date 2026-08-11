/**
 * SaleService — business logic for product sales.
 *
 * Key enforcement:
 * - BR-S05: Employee must be punched in to record a sale
 * - BR-SY03: Idempotent create via localId
 */
import { SaleRepository } from './sale.repository';
import { AppError } from '../../shared/errors/AppError';
import { Sale, Role } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';

export class SaleService {
  private saleRepository = new SaleRepository();

  public async createSale(
    companyId: string,
    userId: string,
    data: {
      localId: string;
      customerId: string;
      remarks?: string;
      items: Array<{ productId: string; quantity: number; price: number }>;
    }
  ): Promise<Sale> {
    // ── Idempotency: return existing record if localId already synced ──────────
    const existing = await this.saleRepository.findByLocalId(data.localId, companyId);
    if (existing) return existing;

    // ── BR-S05: Employee must have an active punch-in ─────────────────────────
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, punchOutTime: null },
      select: { id: true },
    });
    if (!activePunch) {
      throw new AppError(
        'NOT_PUNCHED_IN',
        'You must be punched in to record a sale (BR-S05)',
        403
      );
    }

    // ── Validate customer ─────────────────────────────────────────────────────
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found or belongs to another company', 400);
    }

    // ── Validate products and compute totals ──────────────────────────────────
    let totalAmount = 0;
    const finalItems: Array<{ productId: string; quantity: number; price: number; totalPrice: number }> = [];

    for (const item of data.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, companyId, deletedAt: null },
      });
      if (!product) {
        throw new AppError('PRODUCT_NOT_FOUND', `Product ID ${item.productId} not found in catalog`, 400);
      }

      const totalPrice = item.price * item.quantity;
      totalAmount += totalPrice;
      finalItems.push({ productId: item.productId, quantity: item.quantity, price: item.price, totalPrice });
    }

    return this.saleRepository.create({
      localId: data.localId,
      companyId,
      userId,
      customerId: data.customerId,
      totalAmount,
      remarks: data.remarks ?? null,
      items: finalItems,
    });
  }

  public async getSales(companyId: string, userId: string, role: Role): Promise<Sale[]> {
    if (role === Role.SUPER_ADMIN || role === Role.COMPANY_ADMIN) {
      return this.saleRepository.findMany(companyId);
    }

    if (role === Role.MANAGER) {
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: userId, deletedAt: null },
        select: { id: true },
      });
      const ids = [userId, ...subordinates.map((s) => s.id)];
      return this.saleRepository.findMany(companyId, { userIds: ids });
    }

    return this.saleRepository.findMany(companyId, { userId });
  }

  public async getSaleById(companyId: string, id: string): Promise<Sale> {
    const sale = await this.saleRepository.findById(companyId, id);
    if (!sale) {
      throw new AppError('SALE_NOT_FOUND', 'Sale record not found', 404);
    }
    return sale;
  }

  public async getTodaySales(companyId: string, userId: string): Promise<Sale[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.saleRepository.findTodayByUser(companyId, userId, startOfDay, endOfDay);
  }
}
