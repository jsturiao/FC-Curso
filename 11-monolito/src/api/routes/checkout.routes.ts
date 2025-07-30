import { Router } from 'express';
import CheckoutController from '../controllers/checkout.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { placeOrderValidation } from '../dtos/checkout.dto';

const router = Router();

// POST /checkout - Processar pedido
router.post('/', 
  validateRequest(placeOrderValidation),
  CheckoutController.placeOrder
);

export default router;
