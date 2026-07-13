import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRoles } from '../../shared/middlewares/role.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '@netrotrack/shared';
import { Role } from '@prisma/client';

const router = Router();
const controller = new ProductController();

router.get('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.getProducts);
router.get('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN, Role.MANAGER, Role.FIELD_EMPLOYEE), controller.getProduct);

router.post('/', authMiddleware, requireRoles(Role.COMPANY_ADMIN), validate(createProductSchema), controller.createProduct);
router.put('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN), validate(updateProductSchema), controller.updateProduct);

router.delete('/:id', authMiddleware, requireRoles(Role.COMPANY_ADMIN), controller.deleteProduct);

export { router as productRouter };
