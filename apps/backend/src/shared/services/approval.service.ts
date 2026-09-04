import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { RoleHierarchyRepository } from '../../modules/role-hierarchy/role-hierarchy.repository';
import { ApprovalActionDto } from '@netrotrack/shared';

/** Platform-level roles that bypass company-rank checks but still respect same-company and anti-self rules. */
const PLATFORM_APPROVER_ROLES = new Set(['MASTER_SUPER_ADMIN', 'SUPER_ADMIN']);

export interface ApprovalContext {
  requestType: string;
  requestId: string;
  requesterId: string;
  requesterCompanyId: string;
  requestStatus: string;
}

export interface ApprovalResult {
  allowed: boolean;
  reason?: string;
}

interface RecordActionInput {
  companyId: string;
  requestType: string;
  requestId: string;
  action: 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  approverId: string;
  requesterId: string;
}

export class ApprovalService {
  private readonly hierarchyRepo = new RoleHierarchyRepository();

  /**
   * Determines whether `approverId` is authorized to approve/reject the given request.
   *
   * Validation chain (in order):
   * 1. Request must be PENDING
   * 2. Self-approval is never allowed
   * 3. Both parties must be in the same company
   * 4. Platform admins (MSA / SA) pass automatically after the above checks
   * 5. Company-level: approver's CompanyRole.rank must be strictly lower than requester's
   */
  public async canApprove(approverId: string, context: ApprovalContext): Promise<ApprovalResult> {
    const { requestStatus, requesterId, requesterCompanyId } = context;

    // 1. Actionability
    if (requestStatus !== 'PENDING') {
      return { allowed: false, reason: 'Request has already been reviewed' };
    }

    // 2. Anti-self
    if (approverId === requesterId) {
      return { allowed: false, reason: 'You cannot approve your own request' };
    }

    // Fetch approver
    const approver = await prisma.user.findFirst({
      where: { id: approverId, deletedAt: null },
      select: { id: true, role: true, companyId: true, companyRoleId: true },
    });

    if (!approver) {
      return { allowed: false, reason: 'Approver not found' };
    }

    // 3. Same-company check (MASTER_SUPER_ADMIN exempted — they're cross-tenant)
    if (approver.role !== 'MASTER_SUPER_ADMIN' && approver.companyId !== requesterCompanyId) {
      return { allowed: false, reason: 'Cross-company approval is not permitted' };
    }

    // 4. Platform admins bypass company-level rank checks
    if (PLATFORM_APPROVER_ROLES.has(approver.role)) {
      return { allowed: true };
    }

    // 5. Company-level rank check
    // Fetch the requester's company role rank
    const requester = await prisma.user.findFirst({
      where: { id: requesterId, deletedAt: null },
      select: { companyRoleId: true },
    });

    // If neither party has a company role, fall back to the legacy role-based check
    if (!approver.companyRoleId && !requester?.companyRoleId) {
      return this.legacyRoleCheck(approver.role, context);
    }

    const [approverRoleRow, requesterRoleRow] = await Promise.all([
      approver.companyRoleId
        ? prisma.companyRole.findFirst({ where: { id: approver.companyRoleId, deletedAt: null } })
        : null,
      requester?.companyRoleId
        ? prisma.companyRole.findFirst({ where: { id: requester.companyRoleId, deletedAt: null } })
        : null,
    ]);

    if (!approverRoleRow) {
      // Approver has no company role — fall back to legacy check
      return this.legacyRoleCheck(approver.role, context);
    }

    if (!requesterRoleRow) {
      // Requester has no rank, so any ranked approver can approve
      return { allowed: true };
    }

    if (approverRoleRow.rank < requesterRoleRow.rank) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Your role (rank ${approverRoleRow.rank}) does not have authority over the requester's role (rank ${requesterRoleRow.rank})`,
    };
  }

  /**
   * Records an immutable approval action in the audit trail.
   * Must be called AFTER a successful approval/rejection.
   */
  public async recordApprovalAction(input: RecordActionInput): Promise<void> {
    const [approver, requester] = await Promise.all([
      prisma.user.findFirst({
        where: { id: input.approverId },
        select: { name: true, role: true, companyRoleId: true },
      }),
      prisma.user.findFirst({
        where: { id: input.requesterId },
        select: { name: true, role: true, companyRoleId: true },
      }),
    ]);

    if (!approver || !requester) return; // defensive — should never happen

    const [approverCompanyRole, requesterCompanyRole] = await Promise.all([
      approver.companyRoleId
        ? prisma.companyRole.findFirst({ where: { id: approver.companyRoleId } })
        : null,
      requester.companyRoleId
        ? prisma.companyRole.findFirst({ where: { id: requester.companyRoleId } })
        : null,
    ]);

    await this.hierarchyRepo.createApprovalAction({
      companyId: input.companyId,
      requestType: input.requestType,
      requestId: input.requestId,
      action: input.action,
      remarks: input.remarks ?? null,
      approverId: input.approverId,
      approverName: approver.name,
      approverRole: approver.role,
      approverRoleRank: approverCompanyRole?.rank ?? null,
      approverCompanyRoleName: approverCompanyRole?.name ?? null,
      requesterId: input.requesterId,
      requesterName: requester.name,
      requesterRole: requester.role,
      requesterRoleRank: requesterCompanyRole?.rank ?? null,
      requesterCompanyRoleName: requesterCompanyRole?.name ?? null,
    });
  }

  /** Retrieves the immutable audit trail for a given request. */
  public async getApprovalHistory(
    companyId: string,
    requestType: string,
    requestId: string
  ): Promise<ApprovalActionDto[]> {
    const rows = await this.hierarchyRepo.findApprovalActions(companyId, requestType, requestId);
    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      requestType: row.requestType,
      requestId: row.requestId,
      action: row.action,
      remarks: row.remarks ?? null,
      approverId: row.approverId,
      approverName: row.approverName,
      approverRole: row.approverRole,
      approverRoleRank: row.approverRoleRank ?? null,
      approverCompanyRoleName: row.approverCompanyRoleName ?? null,
      requesterId: row.requesterId,
      requesterName: row.requesterName,
      requesterRole: row.requesterRole,
      requesterRoleRank: row.requesterRoleRank ?? null,
      requesterCompanyRoleName: row.requesterCompanyRoleName ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    }));
  }

  /**
   * Legacy fallback rank check based on the hard-coded Role enum when
   * no CompanyRole rows exist yet for this company.
   */
  private legacyRoleCheck(
    approverRole: string,
    context: ApprovalContext
  ): ApprovalResult {
    const LEGACY_RANK: Record<string, number> = {
      EMPLOYEE: 5,
      MANAGER: 3,
      HR: 2,
      COMPANY_ADMIN: 1,
      SUPER_ADMIN: 0,
      MASTER_SUPER_ADMIN: -1,
    };

    const approverRank = LEGACY_RANK[approverRole] ?? 99;

    // In the legacy model, MANAGER can only approve their direct subordinates.
    // For HR / COMPANY_ADMIN, any employee in the company is fair game.
    // We return allowed=true here and let the caller do the subordinate check if needed.
    if (approverRank < 3) {
      // COMPANY_ADMIN or HR
      return { allowed: true };
    }
    if (approverRank === 3) {
      // MANAGER — caller should have already verified subordinate relationship
      return { allowed: true };
    }

    return { allowed: false, reason: 'Insufficient role authority' };
  }
}
