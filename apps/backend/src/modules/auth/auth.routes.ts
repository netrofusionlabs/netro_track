import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { tenantMiddleware } from '../../shared/middlewares/tenant.middleware';
import { loginSchema } from '@netrotrack/shared';

const router = Router();
const controller = new AuthController();

router.post('/login', tenantMiddleware, validate(loginSchema), controller.login);

export { router as authRouter };
