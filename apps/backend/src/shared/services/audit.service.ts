import { prisma } from '../config/prisma';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'MANAGER_REMOVED'
  | 'EMPLOYEE_REASSIGNED'
  | 'EMPLOYEE_ASSIGNED'
  | 'SUPER_ADMIN_CREATED'
  | 'SUPER_ADMIN_REMOVED'
  | 'COMPANY_CREATED'
  | 'COMPANY_DEACTIVATED'
  | 'RESET_CREDENTIALS';

export interface AuditLogParams {
  companyId?: string | null;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  public async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: params.companyId ?? null,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          oldValues: params.oldValues ? (params.oldValues as any) : undefined,
          newValues: params.newValues ? (params.newValues as any) : undefined,
          metadata: params.metadata ? (params.metadata as any) : undefined,
        },
      });
    } catch (err) {
      // Audit log errors should be logged to stderr but not crash request execution
      console.error('Failed to create audit log entry:', err);
    }
  }
}
