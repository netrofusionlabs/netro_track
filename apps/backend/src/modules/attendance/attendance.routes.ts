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
router.get('/team', requireRoles(Role.MANAGER, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getTeam);
router.get('/company', requireRoles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getCompany);

export { router as attendanceRouter };
