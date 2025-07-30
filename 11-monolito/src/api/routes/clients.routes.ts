import { Router } from 'express';
import ClientController from '../controllers/client.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { createClientValidation } from '../dtos/client.dto';

const router = Router();

// POST /clients - Criar cliente
router.post('/', 
  validateRequest(createClientValidation),
  ClientController.create
);

export default router;
