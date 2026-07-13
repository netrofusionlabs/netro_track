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
      customerId: string;
      checkInTime: string | Date;
      checkOutTime?: string | Date;
      latitude: number;
      longitude: number;
      productsDiscussed?: string;
      notes?: string;
      imageUrl?: string;
    }
  ): Promise<Visit> {
    // 1. Verify customer exists and belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null }
    });
    if (!customer) {
      throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found or belongs to another company', 400);
    }

    const checkIn = new Date(data.checkInTime);
    const checkOut = data.checkOutTime ? new Date(data.checkOutTime) : null;
    let duration: number | null = null;

    if (checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      duration = Math.max(0, Math.floor(diffMs / 1000)); // duration in seconds
    }

    return this.visitRepository.create({
      companyId,
      userId,
      customerId: data.customerId,
      checkInTime: checkIn,
      checkOutTime: checkOut || null,
      duration,
      latitude: data.latitude,
      longitude: data.longitude,
      productsDiscussed: data.productsDiscussed || null,
      notes: data.notes || null,
      imageUrl: data.imageUrl || null
    });
  }

  public async getVisits(companyId: string, userId: string, role: Role): Promise<Visit[]> {
    if (role === Role.SUPER_ADMIN) {
      // Super admins are not scoped to a single company's visits, but fallback to global
      return this.visitRepository.findMany(companyId);
    }

    if (role === Role.COMPANY_ADMIN) {
      // Admins see all visits for their company
      return this.visitRepository.findMany(companyId);
    }

    if (role === Role.MANAGER) {
      // Managers see their team's visits (own visits + subordinates)
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: userId, deletedAt: null },
        select: { id: true }
      });
      const ids = [userId, ...subordinates.map((s) => s.id)];
      return this.visitRepository.findMany(companyId, { userIds: ids });
    }

    // Employees see only their own visits
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
