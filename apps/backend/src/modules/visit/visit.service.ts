/**
 * VisitService — business logic for customer visit records.
 *
 * Key enforcement:
 * - BR-V03: Employee must be punched in to create a visit
 * - BR-SY03: Idempotent create via localId (offline sync safety)
 */
import { VisitRepository } from './visit.repository';
import { AppError } from '../../shared/errors/AppError';
import { Visit, Role } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';

export class VisitService {
  private visitRepository = new VisitRepository();

  public async createVisit(
    companyId: string,
    userId: string,
    data: {
      localId: string;
      customerId: string;
      checkInTime: string | Date;
      checkOutTime?: string | Date;
      latitude: number;
      longitude: number;
      productsDiscussed?: string;
      notes?: string;
      imageUrl?: string;
      photoUrls?: string[];
    }
  ): Promise<Visit> {
    // ── Idempotency: return existing record if localId already synced ──────────
    if (data.localId) {
      const existing = await this.visitRepository.findByLocalId(data.localId, companyId);
      if (existing) return existing;
    }

    // ── BR-V03: Employee must have an active punch-in ─────────────────────────
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, punchOutTime: null },
      select: { id: true },
    });
    if (!activePunch) {
      throw new AppError(
        'NOT_PUNCHED_IN',
        'You must be punched in to record a customer visit (BR-V03)',
        403
      );
    }

    // ── Validate customer belongs to company ──────────────────────────────────
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found or belongs to another company', 400);
    }

    const checkIn = new Date(data.checkInTime);
    const checkOut = data.checkOutTime ? new Date(data.checkOutTime) : null;
    const duration = checkOut
      ? Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000))
      : null;

    return this.visitRepository.create({
      localId: data.localId,
      companyId,
      userId,
      customerId: data.customerId,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      duration,
      latitude: data.latitude,
      longitude: data.longitude,
      productsDiscussed: data.productsDiscussed ?? null,
      notes: data.notes ?? null,
      imageUrl: data.imageUrl ?? null,
      photoUrls: data.photoUrls ?? [],
    });
  }

  public async getVisits(companyId: string, userId: string, role: Role): Promise<Visit[]> {
    if (role === Role.SUPER_ADMIN || role === Role.COMPANY_ADMIN) {
      return this.visitRepository.findMany(companyId);
    }

    if (role === Role.MANAGER) {
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: userId, deletedAt: null },
        select: { id: true },
      });
      const ids = [userId, ...subordinates.map((s) => s.id)];
      return this.visitRepository.findMany(companyId, { userIds: ids });
    }

    return this.visitRepository.findMany(companyId, { userId });
  }

  public async getVisitById(companyId: string, id: string): Promise<Visit> {
    const visit = await this.visitRepository.findById(companyId, id);
    if (!visit) {
      throw new AppError('VISIT_NOT_FOUND', 'Visit record not found', 404);
    }
    return visit;
  }

  public async getTodayVisits(companyId: string, userId: string): Promise<Visit[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.visitRepository.findTodayByUser(companyId, userId, startOfDay, endOfDay);
  }
}
