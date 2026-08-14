import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { Role } from '@prisma/client';
import { CompanyWizardSchema } from '@netrotrack/shared';

const router = Router();
const controller = new CompanyController();

// Only SUPER_ADMIN can create, delete, and list all companies
router.get('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.getCompanies);
router.post('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), validate(CompanyWizardSchema), controller.createCompany);
router.delete('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.deleteCompany);

// Both SUPER_ADMIN and COMPANY_ADMIN can read/update the company profile
router.get('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.getCompany);
router.put('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.updateCompany);

// Logo Upload Endpoints
router.post('/:id/logo/upload-url', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.getLogoUploadUrl);
router.post('/:id/logo/complete', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.completeLogoUpload);

export { router as companyRouter };
