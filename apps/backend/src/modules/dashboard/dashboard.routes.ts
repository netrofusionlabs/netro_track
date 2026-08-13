import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new DashboardController();

router.use(authenticateToken);

// Company-wide summary (admin/HR/manager)
router.get('/summary', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getSummary);
router.get('/attendance-summary', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getAttendanceSummary);
router.get('/sales-summary', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getSalesSummary);

// Team-scoped summary (manager/HR)
router.get('/team-summary', requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN), controller.getTeamSummary);

export { router as dashboardRouter };
