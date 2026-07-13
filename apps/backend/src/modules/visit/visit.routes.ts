import { Router } from 'express';
import { VisitController } from './visit.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new VisitController();

// All visits endpoints require authentication
router.use(authenticateToken);

router.get('/', controller.getVisits);
router.post('/', controller.createVisit);
router.get('/today', controller.getTodayVisits);
router.get('/:id', controller.getVisitById);

export { router as visitRouter };
