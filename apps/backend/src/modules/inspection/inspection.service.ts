/**
 * InspectionService — business logic for field inspections.
 *
 * Key enforcement:
 * - BR-I05: Employee must be punched in to submit an inspection
 * - BR-SY03: Idempotent create via localId
 */
import { InspectionRepository } from './inspection.repository';
import { AppError } from '../../shared/errors/AppError';
import { Inspection, Role } from '@prisma/client';
import { prisma } from '../../shared/config/prisma';

export class InspectionService {
  private inspectionRepository = new InspectionRepository();

  public async createInspection(
    companyId: string,
    userId: string,
    data: {
      localId: string;
      siteName: string;
      category?: string;
      latitude: number;
      longitude: number;
      observation: string;
      recommendation?: string;
      imageUrls: string[];
    }
  ): Promise<Inspection> {
    // ── Idempotency: return existing record if localId already synced ──────────
    const existing = await this.inspectionRepository.findByLocalId(data.localId, companyId);
    if (existing) return existing;

    // ── BR-I05: Employee must have an active punch-in ─────────────────────────
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, punchOutTime: null },
      select: { id: true },
    });
    if (!activePunch) {
      throw new AppError(
        'NOT_PUNCHED_IN',
        'You must be punched in to submit an inspection (BR-I05)',
        403
      );
    }

    return this.inspectionRepository.create({
      localId: data.localId,
      companyId,
      userId,
      siteName: data.siteName,
      category: data.category ?? null,
      latitude: data.latitude,
      longitude: data.longitude,
      observation: data.observation,
      recommendation: data.recommendation ?? null,
      imageUrls: data.imageUrls,
    });
  }

  public async getInspections(companyId: string, userId: string, role: Role): Promise<Inspection[]> {
    if (role === Role.SUPER_ADMIN || role === Role.COMPANY_ADMIN) {
      return this.inspectionRepository.findMany(companyId);
    }

    if (role === Role.MANAGER) {
      const subordinates = await prisma.user.findMany({
        where: { companyId, managerId: userId, deletedAt: null },
        select: { id: true },
      });
      const ids = [userId, ...subordinates.map((s) => s.id)];
      return this.inspectionRepository.findMany(companyId, { userIds: ids });
    }

    return this.inspectionRepository.findMany(companyId, { userId });
  }

  public async getTodayInspections(companyId: string, userId: string): Promise<Inspection[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.inspectionRepository.findTodayByUser(companyId, userId, startOfDay, endOfDay);
  }

  public async getInspectionById(companyId: string, id: string): Promise<Inspection> {
    const inspection = await this.inspectionRepository.findById(companyId, id);
    if (!inspection) {
      throw new AppError('INSPECTION_NOT_FOUND', 'Inspection record not found', 404);
    }
    return inspection;
  }
}
