import { Router } from 'express';
import InvoiceController from '../controllers/invoice.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { findInvoiceValidation } from '../dtos/invoice.dto';

const router = Router();

// GET /invoice/:id - Buscar invoice por ID
router.get('/:id', 
  validateRequest(findInvoiceValidation),
  InvoiceController.findById
);

export default router;
