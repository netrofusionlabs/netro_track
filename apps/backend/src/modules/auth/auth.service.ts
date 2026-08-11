import { AuthRepository } from './auth.repository';
import { LoginInput, MpinLoginInput } from '@netrotrack/shared';
import { AppError } from '../../shared/errors/AppError';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export class AuthService {
  private authRepository = new AuthRepository();

  public async login(input: LoginInput & { os?: string; model?: string; appVersion?: string }) {
    let user;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.loginId);

    if (isEmail) {
      user = await this.authRepository.findUserByEmail(input.loginId);
    } else {
      const parts = input.loginId.split('-');
      if (parts.length < 2) {
        throw new AppError('AUTHENTICATION_FAILED', 'Invalid Login ID format. Use COMPANY-EMPLOYEE', 400);
      }
      const companyCode = parts[0].trim();
      const employeeId = parts.slice(1).join('-').trim();

      const company = await this.authRepository.findCompanyByCode(companyCode);
      if (!company) {
        throw new AppError('AUTHENTICATION_FAILED', 'Invalid credentials', 401);
      }

      user = await this.authRepository.findUserByEmployeeId(company.id, employeeId);
    }

    if (!user) {
      throw new AppError('AUTHENTICATION_FAILED', 'Invalid credentials', 401);
    }

    // 1. Password Verification
    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new AppError('AUTHENTICATION_FAILED', 'Invalid credentials', 401);
    }

    // 2. Device Binding Enforcement
    const existingDevice = await this.authRepository.findDevice(user.id, input.deviceId);
    if (!existingDevice) {
      await this.authRepository.registerDevice({
        userId: user.id,
        deviceId: input.deviceId,
        os: input.os || 'UNKNOWN',
        model: input.model || 'UNKNOWN',
        appVersion: input.appVersion || '1.0.0'
      });
    }

    // 3. Token Generation
    const accessToken = jwt.sign(
      {
        id: user.id,
        companyId: user.companyId,
        employeeId: user.employeeId,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET || 'default_access_secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      { expiresIn: '7d' }
    );

    // Save refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepository.createSession(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        companyId: user.companyId,
        companyName: user.company?.name || 'NetroFusion Technologies',
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      }
    };
  }

  /**
   * Set or update the MPIN for an already-authenticated user.
   */
  public async setupMpin(userId: string, mpin: string): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    const mpinHash = await argon2.hash(mpin);
    await this.authRepository.updateMpinHash(userId, mpinHash);
  }

  /**
   * Quick authenticate using MPIN.
   */
  public async loginWithMpin(input: MpinLoginInput) {
    let user;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.loginId);

    if (isEmail) {
      user = await this.authRepository.findUserByEmail(input.loginId);
    } else {
      const parts = input.loginId.split('-');
      if (parts.length >= 2) {
        const companyCode = parts[0].trim();
        const employeeId = parts.slice(1).join('-').trim();

        const company = await this.authRepository.findCompanyByCode(companyCode);
        if (company) {
          user = await this.authRepository.findUserByEmployeeId(company.id, employeeId);
        }
      }
    }

    if (!user || !user.mpinHash) {
      throw new AppError('AUTHENTICATION_FAILED', 'MPIN not configured for this user', 401);
    }

    const isMpinValid = await argon2.verify(user.mpinHash, input.mpin);
    if (!isMpinValid) {
      throw new AppError('AUTHENTICATION_FAILED', 'Invalid MPIN', 401);
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        companyId: user.companyId,
        employeeId: user.employeeId,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET || 'default_access_secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      { expiresIn: '7d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepository.createSession(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        companyId: user.companyId,
        companyName: user.company?.name || 'NetroFusion Technologies',
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      }
    };
  }
}
