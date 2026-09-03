import { z } from 'zod';

export const createAccessGroupSchema = z.object({
  name: z.string().min(2, 'Access Group name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  capabilityIds: z.array(z.string().uuid('Invalid capability ID')).min(1, 'Select at least one capability'),
});

export type CreateAccessGroupInput = z.infer<typeof createAccessGroupSchema>;

export const updateAccessGroupSchema = z.object({
  name: z.string().min(2, 'Access Group name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  capabilityIds: z.array(z.string().uuid('Invalid capability ID')).optional(),
});

export type UpdateAccessGroupInput = z.infer<typeof updateAccessGroupSchema>;

export const assignUserAccessGroupsSchema = z.object({
  accessGroupIds: z.array(z.string().uuid('Invalid access group ID')),
});

export type AssignUserAccessGroupsInput = z.infer<typeof assignUserAccessGroupsSchema>;

export const assignUserDirectPermissionsSchema = z.object({
  capabilityIds: z.array(z.string().uuid('Invalid capability ID')),
});

export type AssignUserDirectPermissionsInput = z.infer<typeof assignUserDirectPermissionsSchema>;

export const updateTenantEntitlementsSchema = z.object({
  entitlements: z.array(
    z.object({
      capabilityId: z.string().uuid('Invalid capability ID'),
      isEnabled: z.boolean(),
    })
  ).min(1, 'At least one entitlement update is required'),
});

export type UpdateTenantEntitlementsInput = z.infer<typeof updateTenantEntitlementsSchema>;

export const createCapabilitySchema = z.object({
  type: z.enum(['MODULE', 'FEATURE', 'ACTION']),
  parentId: z.string().uuid('Invalid parent ID').optional().nullable(),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores (e.g. custom_reports)'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateCapabilityInput = z.infer<typeof createCapabilitySchema>;

export const updateCapabilitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCapabilityInput = z.infer<typeof updateCapabilitySchema>;

export interface EffectiveAccessProfileDto {
  userId: string;
  userName: string;
  userRole: string;
  companyId: string;
  companyName?: string | null;
  entitledCapabilitySlugs: string[];
  effectiveSlugs: string[];
  assignedGroups: Array<{
    id: string;
    name: string;
    isSystem: boolean;
    isActive: boolean;
    permissionCount: number;
  }>;
  directPermissionSlugs: string[];
  provenance: Record<
    string,
    {
      slug: string;
      name: string;
      type: 'MODULE' | 'FEATURE' | 'ACTION';
      grantedVia: Array<
        | { type: 'GROUP'; groupId: string; groupName: string }
        | { type: 'DIRECT'; assignedAt: string }
      >;
      entitled: boolean;
      effective: boolean;
    }
  >;
  resolvedAt: string;
}
