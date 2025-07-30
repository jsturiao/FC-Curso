import { Router } from 'express';
import ProductController from '../controllers/product.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { createProductValidation } from '../dtos/product.dto';

const router = Router();

// POST /products - Criar produto
router.post('/', 
  validateRequest(createProductValidation),
  ProductController.create
);

export default router;
