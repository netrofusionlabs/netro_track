import { AuthRepository } from './auth.repository';
import { LoginInput, MpinLoginInput, ROLE_DISPLAY_LABELS, ROLE_HIERARCHY, UserRole } from '@netrotrack/shared';
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

      user = await this.authRepository.findUserByEmployeeId(company.id, input.loginId);
      if (!user) {
        user = await this.authRepository.findUserByEmployeeId(company.id, employeeId);
      }
    }

    if (!user) {
      throw new AppError('AUTHENTICATION_FAILED', 'Invalid credentials', 401);
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact your administrator.', 403);
    }

    // 1. Password Verification
    const isPasswordValid = await this.safeVerifyHash(user.passwordHash, input.password);
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
    const normalizedRole = user.role;
    const accessToken = jwt.sign(
      {
        id: user.id,
        companyId: user.companyId,
        employeeId: user.employeeId,
        role: normalizedRole
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

    const storageService = (await import('../../shared/services/storage.service')).StorageService.getInstance();
    const permissionService = (await import('../../shared/services/permission.service')).PermissionService.getInstance();
    const permissions = user.companyId ? Array.from(await permissionService.getEffectivePermissions(user.id, user.companyId)) : [];
    const companyEntitledSlugs = user.companyId ? Array.from(await permissionService.getTenantEntitledSlugs(user.companyId)) : [];
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        companyId: user.companyId,
        companyName: user.company?.name || 'NetroFusion Technologies',
        companyLogoUrl: (user.company as any)?.logoFile?.objectKey ? storageService.getPublicUrl((user.company as any).logoFile.objectKey) : null,
        employeeId: user.employeeId,
        name: user.name,
        role: normalizedRole,
        isMasterAdmin: user.role === 'MASTER_SUPER_ADMIN',
        permissions,
        companyEntitledSlugs,
        isGpsEnabled: this.getGpsStatus(user),
        isRegularizationEnabled: this.getRegularizationStatus(user),
        isGpsTracked: user.isGpsTracked ?? true,
        hasMpin: !!user.mpinHash,
        managerId: user.manager?.id ?? null,
        managerName: user.manager?.name ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        personalEmail: user.personalEmail ?? null,
        emergencyContactName: user.emergencyContactName ?? null,
        emergencyContactPhone: user.emergencyContactPhone ?? null,
        bloodGroup: user.bloodGroup ?? null,
        designationName: (user as any).designation?.name ?? null,
        designation: (user as any).designation ?? null,
        profilePictureUrl: (user as any).profilePicture?.objectKey ? storageService.getPublicUrl((user as any).profilePicture.objectKey) : null,
      }
    };
  }

  /**
   * Verify the MPIN for an already-authenticated user.
   * Used for daily unlock after session is restored from storage.
   */
  public async verifyMpin(userId: string, mpin: string): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    if (!user.mpinHash) {
      throw new AppError('MPIN_NOT_SET', 'MPIN has not been configured for this account', 400);
    }

    const isMpinValid = await this.safeVerifyHash(user.mpinHash, mpin);
    if (!isMpinValid) {
      throw new AppError('INVALID_MPIN', 'Incorrect MPIN', 401);
    }
  }

  /**
   * Set or update the MPIN for an already-authenticated user.
   */
  public async getMe(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }
    const normalizedRole = user.role;
    const storageService = (await import('../../shared/services/storage.service')).StorageService.getInstance();
    const permissionService = (await import('../../shared/services/permission.service')).PermissionService.getInstance();
    const permissions = user.companyId ? Array.from(await permissionService.getEffectivePermissions(user.id, user.companyId)) : [];
    const companyEntitledSlugs = user.companyId ? Array.from(await permissionService.getTenantEntitledSlugs(user.companyId)) : [];

    return {
      id: user.id,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      companyLogoUrl: (user.company as any)?.logoFile?.objectKey ? storageService.getPublicUrl((user.company as any).logoFile.objectKey) : null,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      personalEmail: user.personalEmail ?? null,
      emergencyContactName: user.emergencyContactName ?? null,
      emergencyContactPhone: user.emergencyContactPhone ?? null,
      role: normalizedRole,
      permissions,
      companyEntitledSlugs,
      managerId: user.manager?.id ?? null,
      managerName: user.manager?.name ?? null,
      managerEmployeeId: user.manager?.employeeId ?? null,
      isGpsEnabled: this.getGpsStatus(user),
      isRegularizationEnabled: this.getRegularizationStatus(user),
      isGpsTracked: user.isGpsTracked,
      hasMpin: !!user.mpinHash,
      bloodGroup: user.bloodGroup ?? null,
      profilePictureUrl: (user as any).profilePicture?.objectKey ? storageService.getPublicUrl((user as any).profilePicture.objectKey) : null,
    };
  }

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
          user = await this.authRepository.findUserByEmployeeId(company.id, input.loginId);
          if (!user) {
            user = await this.authRepository.findUserByEmployeeId(company.id, employeeId);
          }
        }
      }
    }

    if (!user || !user.mpinHash) {
      throw new AppError('AUTHENTICATION_FAILED', 'MPIN not configured for this user', 401);
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact your administrator.', 403);
    }

    const isMpinValid = await this.safeVerifyHash(user.mpinHash, input.mpin);
    if (!isMpinValid) {
      throw new AppError('AUTHENTICATION_FAILED', 'Invalid MPIN', 401);
    }

    const normalizedRole = user.role;
    const accessToken = jwt.sign(
      {
        id: user.id,
        companyId: user.companyId,
        employeeId: user.employeeId,
        role: normalizedRole
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

    const permissionService = (await import('../../shared/services/permission.service')).PermissionService.getInstance();
    const permissions = user.companyId ? Array.from(await permissionService.getEffectivePermissions(user.id, user.companyId)) : [];
    const companyEntitledSlugs = user.companyId ? Array.from(await permissionService.getTenantEntitledSlugs(user.companyId)) : [];

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        companyId: user.companyId,
        companyName: user.company?.name || 'NetroFusion Technologies',
        employeeId: user.employeeId,
        name: user.name,
        role: normalizedRole,
        isMasterAdmin: normalizedRole === 'MASTER_SUPER_ADMIN',
        permissions,
        companyEntitledSlugs,
        isGpsEnabled: this.getGpsStatus(user),
        isRegularizationEnabled: this.getRegularizationStatus(user),
        isGpsTracked: user.isGpsTracked ?? true,
        hasMpin: !!user.mpinHash,
        managerId: user.manager?.id ?? null,
        managerName: user.manager?.name ?? null,
      }
    };
  }

  public async getDemoUsers() {
    const rawUsers = await this.authRepository.findEligibleDemoUsers();
    const storageService = (await import('../../shared/services/storage.service')).StorageService.getInstance();

    const formattedUsers = rawUsers.map((u) => {
      const companyCode = u.company?.code || 'NETRO';
      const rawEmpId = u.employeeId || '';
      const loginId = rawEmpId.toUpperCase().startsWith(`${companyCode.toUpperCase()}-`)
        ? rawEmpId
        : `${companyCode}-${rawEmpId}`;

      const roleEnum = u.role as unknown as UserRole;
      const roleLabel = ROLE_DISPLAY_LABELS[roleEnum] || u.role;
      const roleOrder = ROLE_HIERARCHY[roleEnum] ?? 0;

      const logoObjectKey = (u.company as any)?.logoFile?.objectKey;
      const companyLogoUrl = logoObjectKey ? storageService.getPublicUrl(logoObjectKey) : null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        employeeId: u.employeeId,
        loginId,
        role: u.role,
        roleLabel,
        roleOrder,
        designation: u.designation?.name || null,
        companyId: u.company?.id || u.companyId,
        companyName: u.company?.name || 'NetroTrack',
        companyCode,
        companyLogoUrl,
        defaultPassword: 'Password123!',
        defaultMpin: '9999',
      };
    });

    // Group by Tenant / Company -> Access Role -> User Name
    const tenantMap = new Map<string, {
      companyId: string;
      companyName: string;
      companyCode: string;
      companyLogoUrl: string | null;
      roleMap: Map<string, {
        role: string;
        roleLabel: string;
        roleOrder: number;
        users: typeof formattedUsers;
      }>;
    }>();

    for (const u of formattedUsers) {
      if (!tenantMap.has(u.companyId)) {
        tenantMap.set(u.companyId, {
          companyId: u.companyId,
          companyName: u.companyName,
          companyCode: u.companyCode,
          companyLogoUrl: u.companyLogoUrl,
          roleMap: new Map(),
        });
      }

      const tenant = tenantMap.get(u.companyId)!;
      if (!tenant.roleMap.has(u.role)) {
        tenant.roleMap.set(u.role, {
          role: u.role,
          roleLabel: u.roleLabel,
          roleOrder: u.roleOrder,
          users: [],
        });
      }

      tenant.roleMap.get(u.role)!.users.push(u);
    }

    const tenants = Array.from(tenantMap.values()).map((t) => {
      const roles = Array.from(t.roleMap.values())
        .sort((a, b) => b.roleOrder - a.roleOrder)
        .map((r) => ({
          role: r.role,
          roleLabel: r.roleLabel,
          roleOrder: r.roleOrder,
          users: r.users.sort((a, b) => a.name.localeCompare(b.name)),
        }));

      return {
        companyId: t.companyId,
        companyName: t.companyName,
        companyCode: t.companyCode,
        companyLogoUrl: t.companyLogoUrl,
        roles,
        userCount: roles.reduce((sum, r) => sum + r.users.length, 0),
      };
    }).sort((a, b) => {
      // Platform / NETRO company first, then alphabetical by company name
      if (a.companyCode === 'NETRO') return -1;
      if (b.companyCode === 'NETRO') return 1;
      return a.companyName.localeCompare(b.companyName);
    });

    return {
      tenants,
      users: formattedUsers,
      totalCount: formattedUsers.length,
    };
  }

  private getRegularizationStatus(user: any): boolean {
    const modules = user.company?.modules || [];
    const hasAttendance = modules.some((m: any) => m.module === 'ATTENDANCE' && m.isEnabled);
    const hasRegularizationRecord = modules.some((m: any) => m.module === 'REGULARIZATION');
    return hasRegularizationRecord
      ? modules.some((m: any) => m.module === 'REGULARIZATION' && m.isEnabled)
      : hasAttendance;
  }

  private getGpsStatus(user: any): boolean {
    const modules = user.company?.modules || [];
    const hasGpsRecord = modules.some((m: any) => m.module === 'GPS');
    return hasGpsRecord
      ? modules.some((m: any) => m.module === 'GPS' && m.isEnabled)
      : (user.company?.isGpsEnabled ?? true);
  }

  private async safeVerifyHash(hash: string | null, plain: string): Promise<boolean> {
    if (!hash || !hash.startsWith('$')) {
      return false;
    }
    try {
      return await argon2.verify(hash, plain);
    } catch (err) {
      return false;
    }
  }
}
