import { prisma } from '../../shared/config/prisma';
import { User, Device, Session, Company } from '@prisma/client';

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

  public async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        },
        deletedAt: null
      }
    });
  }

  public async findUserByEmployeeId(companyId: string, employeeId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        companyId,
        employeeId: {
          equals: employeeId,
          mode: 'insensitive'
        },
        deletedAt: null
      }
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
    return prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId: deviceData.userId,
          deviceId: deviceData.deviceId
        }
      },
      update: {
        os: deviceData.os,
        model: deviceData.model,
        appVersion: deviceData.appVersion
      },
      create: deviceData
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
}
