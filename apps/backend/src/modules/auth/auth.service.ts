import { AuthRepository } from './auth.repository';
import { LoginInput } from '@netrotrack/shared';
import { AppError } from '../../shared/errors/AppError';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export class AuthService {
  private authRepository = new AuthRepository();

  public async login(input: LoginInput & { os?: string; model?: string; appVersion?: string }) {
    const user = await this.authRepository.findUserByEmployeeId(input.companyId, input.employeeId);

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
      // If it's a new device, bind it (simplification for Phase 1 - register on first login)
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
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      }
    };
  }
}
