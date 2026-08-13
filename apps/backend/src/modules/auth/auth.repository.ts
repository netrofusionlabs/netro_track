import { prisma } from '../../shared/config/prisma';
import { User, Device, Session, Company } from '@prisma/client';

export type UserWithCompany = User & {
  company?: Company | null;
  manager?: { id: string; name: string; employeeId: string } | null;
};

export class AuthRepository {
  public async findCompanyByCode(code: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive'
        },
        deletedAt: null
      }
    });
  }

  public async findUserByEmail(email: string): Promise<UserWithCompany | null> {
    return prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        company: true,
        manager: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  public async findUserByEmployeeId(companyId: string, employeeId: string): Promise<UserWithCompany | null> {
    return prisma.user.findFirst({
      where: {
        companyId,
        employeeId: { equals: employeeId, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        company: true,
        manager: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  public async findUserById(id: string): Promise<UserWithCompany | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        manager: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  public async findDevice(userId: string, deviceId: string): Promise<Device | null> {
    return prisma.device.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      }
    });
  }

  public async registerDevice(deviceData: {
    userId: string;
    deviceId: string;
    os: string;
    model: string;
    appVersion: string;
  }): Promise<Device> {
    return prisma.device.create({
      data: deviceData
    });
  }

  public async createSession(userId: string, refreshToken: string, expiresAt: Date): Promise<Session> {
    return prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt
      }
    });
  }

  public async findSession(refreshToken: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { refreshToken }
    });
  }

  public async deleteSession(refreshToken: string): Promise<void> {
    await prisma.session.delete({
      where: { refreshToken }
    });
  }

  public async updateMpinHash(userId: string, mpinHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { mpinHash }
    });
  }
}
