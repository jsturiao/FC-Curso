import { Request, Response, NextFunction } from 'express';
import APIFactory from '../../factories/api.factory';
import { PlaceOrderRequestDto, PlaceOrderResponseDto } from '../dtos/checkout.dto';
import { createError } from '../middlewares/error-handler.middleware';

export default class CheckoutController {
  static async placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestData: PlaceOrderRequestDto = req.body;
      
      // Usar APIFactory para criar PlaceOrderUseCase com todas as dependências
      const placeOrderUseCase = APIFactory.createPlaceOrderUseCase();
      
      // Executar o use case
      const result = await placeOrderUseCase.execute({
        clientId: requestData.clientId,
        products: requestData.products
      });

      const response: PlaceOrderResponseDto = {
        id: result.id,
        invoiceId: result.invoiceId,
        status: result.status,
        total: result.total,
        products: result.products
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('CheckoutController.placeOrder error:', error);
      
      // Mapear erros específicos de negócio
      let statusCode = 500;
      let message = error.message || 'Failed to process order';
      
      if (error.message) {
        if (error.message.includes('Client not found')) {
          statusCode = 404;
          message = 'Client not found';
        } else if (error.message.includes('Product not found')) {
          statusCode = 404;
          message = 'One or more products not found';
        } else if (error.message.includes('out of stock')) {
          statusCode = 400;
          message = 'One or more products are out of stock';
        } else if (error.message.includes('No products selected')) {
          statusCode = 400;
          message = 'No products selected for checkout';
        }
      }
      
      const apiError = createError(message, statusCode, { originalError: error.message });
      next(apiError);
    }
  }
}
