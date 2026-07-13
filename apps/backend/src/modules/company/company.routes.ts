import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new CompanyController();

// Only SUPER_ADMIN can create, delete, and list all companies
router.get('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.getCompanies);
router.post('/', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.createCompany);
router.delete('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN), controller.deleteCompany);

// Both SUPER_ADMIN and COMPANY_ADMIN can read/update the company profile
router.get('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.getCompany);
router.put('/:id', authMiddleware, requireRoles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN), controller.updateCompany);

export { router as companyRouter };
