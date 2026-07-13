import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createCustomerSchema, updateCustomerSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

const router = Router();
const controller = new CustomerController();

router.get('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.getCustomers);
router.get('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.getCustomer);

router.post('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), validate(createCustomerSchema), controller.createCustomer);
router.put('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), validate(updateCustomerSchema), controller.updateCustomer);

router.delete('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN), controller.deleteCustomer);

export { router as customerRouter };
