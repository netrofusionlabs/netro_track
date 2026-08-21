import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new AttendanceController();

// All attendance operations require authentication
router.use(authenticateToken);

router.get('/today', controller.getToday);
router.get('/active', controller.getActivePunch);
router.post('/punch-in', controller.punchIn);
router.post('/punch-out', controller.punchOut);
router.get('/history', controller.getHistory);
router.get('/monthly', controller.getMonthly);
router.get('/summary', controller.getSummary);
router.get('/team', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getTeam);
router.get('/company', requireRoles(Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getCompany);

// Regularization Routes
router.get('/regularization', controller.getRegularizations);
router.post('/regularization', controller.requestRegularization);
router.post('/regularization/bulk-review', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.bulkReviewRegularizations);
router.post('/regularization/:id/review', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.reviewRegularization);

export { router as attendanceRouter };
