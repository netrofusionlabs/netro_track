import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────────
// Shared DTOs
// ──────────────────────────────────────────────────────────────────────────────

export interface CompanyRoleDto {
  id: string;
  companyId: string;
  name: string;
  code: string;
  rank: number;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export interface ApprovalActionDto {
  id: string;
  companyId: string;
  requestType: string;
  requestId: string;
  action: string;
  remarks?: string | null;
  approverId: string;
  approverName: string;
  approverRole: string;
  approverRoleRank?: number | null;
  approverCompanyRoleName?: string | null;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  requesterRoleRank?: number | null;
  requesterCompanyRoleName?: string | null;
  createdAt: string;
}

export interface RoleHierarchyConfig {
  enabled: boolean;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    rank: number;
    isSystem: boolean;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Zod Validation Schemas
// ──────────────────────────────────────────────────────────────────────────────

export const CreateCompanyRoleSchema = z.object({
  name: z.string().min(1).max(100),
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be UPPER_SNAKE_CASE'),
  rank: z.number().int().positive(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateCompanyRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rank: z.number().int().positive().optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const ReorderCompanyRolesSchema = z.object({
  // Array of { id, rank } to reorder
  roles: z
    .array(
      z.object({
        id: z.string().uuid(),
        rank: z.number().int().positive(),
      })
    )
    .min(1),
});

export type CreateCompanyRoleInput = z.infer<typeof CreateCompanyRoleSchema>;
export type UpdateCompanyRoleInput = z.infer<typeof UpdateCompanyRoleSchema>;
export type ReorderCompanyRolesInput = z.infer<typeof ReorderCompanyRolesSchema>;
