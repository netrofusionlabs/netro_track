import { Router } from 'express';
import { TrackingController } from './tracking.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new TrackingController();

router.use(authenticateToken);

// Any authenticated user can sync their own GPS batch
router.post('/sync', controller.syncBatch);

// Own route query (employees) or any user route (managers/admins)
router.get('/route', controller.getRoute);

// Live team locations — managers and admins only
router.get(
  '/live',
  requireRoles(Role.MANAGER, Role.COMPANY_ADMIN, Role.SUPER_ADMIN),
  controller.getLiveLocations
);

export { router as trackingRouter };
