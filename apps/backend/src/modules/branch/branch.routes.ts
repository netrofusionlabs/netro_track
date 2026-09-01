import { Router } from 'express';
import { BranchController } from './branch.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createBranchSchema, updateBranchSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

const router = Router();
const controller = new BranchController();

router.get('/', authMiddleware, requireRoles(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.getBranches);
router.get('/:id', authMiddleware, requireRoles(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.getBranch);

router.post('/', authMiddleware, requireRoles(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR), validate(createBranchSchema), controller.createBranch);
router.put('/:id', authMiddleware, requireRoles(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR), validate(updateBranchSchema), controller.updateBranch);

router.delete('/:id', authMiddleware, requireRoles(Role.MASTER_SUPER_ADMIN, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR), controller.deleteBranch);

export { router as branchRouter };
