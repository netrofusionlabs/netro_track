import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new ReportController();

// All report endpoints require authentication
// Field employees can only access their own data (enforced in controller)
router.use(authenticateToken);

router.get('/attendance', controller.getAttendanceReport);
router.get('/visits', controller.getVisitsReport);
router.get('/sales', controller.getSalesReport);

export { router as reportRouter };
