import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { requireRoles } from '../../shared/middlewares/role.middleware';

const router = Router();
const controller = new ProfileController();

router.use(authenticateToken);

// All authenticated users can upload their own profile picture
router.post(
  '/profile-picture/upload-url',
  requireRoles(Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN),
  controller.getUploadUrl
);

router.post(
  '/profile-picture/complete',
  requireRoles(Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN),
  controller.completeUpload
);

export { router as profileRouter };
