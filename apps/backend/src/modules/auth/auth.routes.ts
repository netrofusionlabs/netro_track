import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { loginSchema, setupMpinSchema, mpinLoginSchema } from '@netrotrack/shared';

const router = Router();
const controller = new AuthController();

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), controller.login);

// Full MPIN login (public — user not yet authenticated)
router.post('/mpin', validate(mpinLoginSchema), controller.mpinLogin);

// Demo Login Users endpoint (public / temporary quick-login helper)
router.get('/demo-users', controller.getDemoUsers);

// ── Authenticated ─────────────────────────────────────────────────────────────

// Get current user's profile (including manager info)
router.get('/me', authenticateToken, controller.getMe);

// Set or update MPIN (called after first password login on new device)
router.post('/mpin/setup', authenticateToken, validate(setupMpinSchema), controller.setupMpin);

// Verify MPIN for daily re-authentication
router.post('/mpin/verify', authenticateToken, validate(setupMpinSchema), controller.verifyMpin);

export { router as authRouter };
