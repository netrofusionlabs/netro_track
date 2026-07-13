import { prisma } from '../../shared/config/prisma';
import { Customer } from '@prisma/client';

export class CustomerRepository {
  public async findMany(companyId: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(companyId: string, id: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null }
    });
  }

  public async create(data: {
    companyId: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    village?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    type?: string | null;
    createdById?: string | null;
  }): Promise<Customer> {
    return prisma.customer.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        village: data.village,
        latitude: data.latitude,
        longitude: data.longitude,
        type: data.type,
        createdById: data.createdById
      }
    });
  }

  public async update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      village?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      type?: string | null;
    }
  ): Promise<Customer> {
    return prisma.customer.update({
      where: { id, companyId },
      data
    });
  }

  public async softDelete(companyId: string, id: string): Promise<Customer> {
    return prisma.customer.update({
      where: { id, companyId },
      data: { deletedAt: new Date() }
    });
  }
}
