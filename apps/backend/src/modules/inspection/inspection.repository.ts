/**
 * InspectionRepository — data access for field inspection records.
 * Supports idempotent create via localId (BR-SY03).
 */
import { prisma } from '../../shared/config/prisma';
import { Inspection } from '@prisma/client';

export class InspectionRepository {
  public async create(data: {
    localId?: string | null;
    companyId: string;
    userId: string;
    siteName: string;
    category?: string | null;
    latitude: number;
    longitude: number;
    observation: string;
    recommendation?: string | null;
    imageUrls: string[];
  }): Promise<Inspection> {
    return prisma.inspection.create({
      data: {
        localId: data.localId ?? null,
        companyId: data.companyId,
        userId: data.userId,
        siteName: data.siteName,
        category: data.category ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        observation: data.observation,
        recommendation: data.recommendation ?? null,
        imageUrls: data.imageUrls,
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  /** Find an existing inspection by client-generated localId (for idempotency). */
  public async findByLocalId(localId: string, companyId: string): Promise<Inspection | null> {
    return prisma.inspection.findFirst({
      where: { localId, companyId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  public async findMany(
    companyId: string,
    filter?: { userId?: string; userIds?: string[] }
  ): Promise<Inspection[]> {
    return prisma.inspection.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.userIds ? { userId: { in: filter.userIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findTodayByUser(
    companyId: string,
    userId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<Inspection[]> {
    return prisma.inspection.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findById(companyId: string, id: string): Promise<Inspection | null> {
    return prisma.inspection.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }
}
