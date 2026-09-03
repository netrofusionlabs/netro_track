import { Router } from 'express';
import { AuthorizationController } from './authorization.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { Role } from '@prisma/client';
import {
  createAccessGroupSchema,
  updateAccessGroupSchema,
  assignUserAccessGroupsSchema,
  assignUserDirectPermissionsSchema,
  updateTenantEntitlementsSchema,
  createCapabilitySchema,
  updateCapabilitySchema,
} from '@netrotrack/shared';

const router = Router();
const controller = new AuthorizationController();

router.use(authenticateToken);

// ─── Platform Capabilities (Platform Super Admin) ─────────────────────────────
router.get(
  '/capabilities',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  controller.getPlatformCapabilities
);

router.post(
  '/capabilities',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  validate(createCapabilitySchema),
  controller.createCapability
);

router.put(
  '/capabilities/:id',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  validate(updateCapabilitySchema),
  controller.updateCapability
);

router.delete(
  '/capabilities/:id',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  controller.deleteCapability
);

// ─── Tenant Entitlements (Platform Super Admin) ────────────────────────────────
router.get(
  '/companies/:companyId/entitlements',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  controller.getTenantEntitlements
);

router.put(
  '/companies/:companyId/entitlements',
  requireRoles(Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN),
  validate(updateTenantEntitlementsSchema),
  controller.updateTenantEntitlements
);

// ─── Tenant Available Capabilities (For Permission Picker in UI) ──────────────
router.get(
  '/available-capabilities',
  requirePermission('access_control.groups.view', 'access_control.groups.manage'),
  controller.getAvailableCapabilities
);

// ─── Tenant Access Groups Management ──────────────────────────────────────────
router.get(
  '/access-groups',
  requirePermission('access_control.groups.view'),
  controller.getAccessGroups
);

router.get(
  '/access-groups/:id',
  requirePermission('access_control.groups.view'),
  controller.getAccessGroup
);

router.post(
  '/access-groups',
  requirePermission('access_control.groups.manage'),
  validate(createAccessGroupSchema),
  controller.createAccessGroup
);

router.put(
  '/access-groups/:id',
  requirePermission('access_control.groups.manage'),
  validate(updateAccessGroupSchema),
  controller.updateAccessGroup
);

router.delete(
  '/access-groups/:id',
  requirePermission('access_control.groups.manage'),
  controller.deleteAccessGroup
);

// ─── User Permission Management & Debug Inspector ────────────────────────────
router.get(
  '/users/:userId/access-profile',
  requirePermission('access_control.user_permissions.view'),
  controller.getUserAccessProfile
);

router.put(
  '/users/:userId/access-groups',
  requirePermission('access_control.user_permissions.assign'),
  validate(assignUserAccessGroupsSchema),
  controller.assignUserGroups
);

router.put(
  '/users/:userId/direct-permissions',
  requirePermission('access_control.user_permissions.assign'),
  validate(assignUserDirectPermissionsSchema),
  controller.assignUserDirectPermissions
);

export { router as authorizationRouter };
