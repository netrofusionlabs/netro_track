import { Router } from 'express';
import { InspectionController } from './inspection.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new InspectionController();

// All inspection endpoints require authentication
router.use(authenticateToken);

router.get('/', controller.getInspections);
router.post('/', controller.createInspection);
router.get('/today', controller.getTodayInspections);
router.get('/:id', controller.getInspectionById);

export { router as inspectionRouter };
