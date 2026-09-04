import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantMiddleware } from '../../shared/middlewares/tenant.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  CreateCompanyRoleSchema,
  UpdateCompanyRoleSchema,
  ReorderCompanyRolesSchema,
} from '@netrotrack/shared';
import { RoleHierarchyController } from './role-hierarchy.controller';

const router = Router();
const ctrl = new RoleHierarchyController();

// All routes require authentication; tenant middleware injects companyId for company users.
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET   /api/v1/role-hierarchy                      — list company roles
router.get('/', ctrl.getCompanyRoles);

// GET   /api/v1/role-hierarchy/:id                  — get single role
router.get('/:id', ctrl.getCompanyRole);

// POST  /api/v1/role-hierarchy                      — create role
router.post('/', validate(CreateCompanyRoleSchema), ctrl.createCompanyRole);

// PUT   /api/v1/role-hierarchy/reorder              — bulk reorder (must come before /:id)
router.put('/reorder', validate(ReorderCompanyRolesSchema), ctrl.reorderCompanyRoles);

// PUT   /api/v1/role-hierarchy/:id                  — update role
router.put('/:id', validate(UpdateCompanyRoleSchema), ctrl.updateCompanyRole);

// DELETE /api/v1/role-hierarchy/:id                 — soft-delete role
router.delete('/:id', ctrl.deleteCompanyRole);

// GET   /api/v1/role-hierarchy/approval-history/:requestType/:requestId
router.get('/approval-history/:requestType/:requestId', ctrl.getApprovalHistory);

export { router as roleHierarchyRouter };
