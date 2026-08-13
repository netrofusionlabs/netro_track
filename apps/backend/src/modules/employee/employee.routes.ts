import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new EmployeeController();

// Admins, HR and Managers can list employees (Managers are team-filtered in controller)
router.get('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR, Role.MANAGER), controller.getEmployees);

// Admins, HR, Managers (only team), and Self can read employee profile
router.get('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.getEmployee);

// Admins and HR can create employees
router.post('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR), controller.createEmployee);

// Admins, HR and Self can update employee profiles
router.put('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE), controller.updateEmployee);

// Admins and HR can delete employees
router.delete('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.HR), controller.deleteEmployee);

export { router as employeeRouter };
