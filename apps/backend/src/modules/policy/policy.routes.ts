import { Router } from 'express';
import { PolicyController } from './policy.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new PolicyController();

// All operations require active auth tokens
router.use(authenticateToken);

// Effective policy resolution endpoint (accessible to all authenticated roles)
router.get('/effective', controller.getEffectivePolicy);

// CRUD and management endpoints (restricted to HR, Company Admin, and Platform Admin roles)
const adminRoles = [Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.MASTER_SUPER_ADMIN];

router.get('/', requireRoles(...adminRoles), controller.getPolicies);
router.get('/:id', requireRoles(...adminRoles), controller.getPolicyById);
router.post('/', requireRoles(...adminRoles), controller.createPolicy);
router.put('/:id', requireRoles(...adminRoles), controller.updatePolicy);
router.delete('/:id', requireRoles(...adminRoles), controller.deletePolicy);
router.post('/:id/duplicate', requireRoles(...adminRoles), controller.duplicatePolicy);
router.get('/:id/assignments', requireRoles(...adminRoles), controller.getPolicyAssignments);
router.post('/assign', requireRoles(...adminRoles), controller.assignPolicy);

export { router as policyRouter };
