import { Router } from 'express';
import { SaleController } from './sale.controller';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new SaleController();

// All sales endpoints require authentication
router.use(authenticateToken);

router.get('/', controller.getSales);
router.post('/', controller.createSale);
router.get('/today', controller.getTodaySales);
router.get('/:id', controller.getSaleById);

export { router as saleRouter };
