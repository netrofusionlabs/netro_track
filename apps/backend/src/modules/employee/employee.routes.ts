import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new EmployeeController();

// Admins and Managers can list employees (Managers are team-filtered in controller)
router.get('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER), controller.getEmployees);

// Admins, Managers (only team), and Self can read employee profile
router.get('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.getEmployee);

// Only Admins can create employees
router.post('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN), controller.createEmployee);

// Admins and Self can update employee profiles
router.put('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.updateEmployee);

// Only Admins can delete employees
router.delete('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN), controller.deleteEmployee);

export { router as employeeRouter };
