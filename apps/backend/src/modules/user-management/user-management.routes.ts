import { Router } from 'express';
import { UserManagementController } from './user-management.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { Role } from '@prisma/client';
import {
  createUserSchema,
  updateUserSchema,
  removeManagerSchema,
} from '@netrotrack/shared';

const router = Router();
const controller = new UserManagementController();

router.use(authenticateToken);

// List users (accessible to Manager, HR, Company Admin, Super Admin, Master Super Admin)
router.get('/', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getUsers);

// Get list of active managers (for selection dropdowns)
router.get('/managers', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getCompanyManagers);

// Get unassigned employees
router.get('/unassigned', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getUnassignedEmployees);

// Get eligible supervisors for a target role (for "Reporting To" picker in Add User form)
router.get('/supervisors', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getSupervisors);

// Get user profile by ID
router.get('/:id', requireRoles(Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getUser);

// Get user professional timeline audit log
router.get('/:id/timeline', requireRoles(Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getUserTimeline);

// Create user (Role-aware: Manager creates Employee; HR creates Manager/Employee; Admin creates Manager/Employee; Super Admin creates Company Admin; Master creates Super Admin)
router.post('/', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), validate(createUserSchema), controller.createUser);

// Update user details
router.put('/:id', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), validate(updateUserSchema), controller.updateUser);

// Deactivate user
router.post('/:id/deactivate', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.deactivateUser);

// Reactivate user
router.post('/:id/activate', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.activateUser);

// Reset user password / MPIN to default
router.post('/:id/reset-credentials', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.resetCredentials);

// Manager removal workflow with employee reassignment
router.post('/:id/remove-manager', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), validate(removeManagerSchema), controller.removeManager);

export { router as userManagementRouter };
