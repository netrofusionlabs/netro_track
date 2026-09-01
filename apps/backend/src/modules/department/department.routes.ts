import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createDepartmentSchema, updateDepartmentSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

const router = Router();
const controller = new DepartmentController();

router.get('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.getDepartments);
router.get('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.getDepartment);

router.post('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR), validate(createDepartmentSchema), controller.createDepartment);
router.put('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR), validate(updateDepartmentSchema), controller.updateDepartment);

router.delete('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR), controller.deleteDepartment);

export { router as departmentRouter };
