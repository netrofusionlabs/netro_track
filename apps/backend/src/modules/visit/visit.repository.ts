import { prisma } from '../../shared/config/prisma';
import { Visit } from '@prisma/client';

export class VisitRepository {
  public async create(data: {
    companyId: string;
    userId: string;
    customerId: string;
    checkInTime: Date;
    checkOutTime?: Date | null;
    duration?: number | null;
    latitude: number;
    longitude: number;
    productsDiscussed?: string | null;
    notes?: string | null;
    imageUrl?: string | null;
  }): Promise<Visit> {
    return prisma.visit.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        customerId: data.customerId,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        duration: data.duration,
        latitude: data.latitude,
        longitude: data.longitude,
        productsDiscussed: data.productsDiscussed,
        notes: data.notes,
        imageUrl: data.imageUrl
      },
      include: {
        customer: true,
        user: true
      }
    });
  }

  public async findMany(companyId: string, filter?: { userId?: string; userIds?: string[] }): Promise<Visit[]> {
    return prisma.visit.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.userIds ? { userId: { in: filter.userIds } } : {})
      },
      include: {
        customer: true,
        user: true
      },
      orderBy: { checkInTime: 'desc' }
    });
  }

  public async findById(companyId: string, id: string): Promise<Visit | null> {
    return prisma.visit.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
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
  ): Promise<Visit[]> {
    return prisma.visit.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        checkInTime: { gte: startOfDay, lte: endOfDay }
      },
      include: { customer: true, user: true },
      orderBy: { checkInTime: 'asc' }
    });
  }
}
