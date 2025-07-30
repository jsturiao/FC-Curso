import { Request, Response, NextFunction } from 'express';
import APIFactory from '../../factories/api.factory';
import { CreateProductRequestDto, CreateProductResponseDto } from '../dtos/product.dto';
import { createError } from '../middlewares/error-handler.middleware';

export default class ProductController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestData: CreateProductRequestDto = req.body;
      
      // Usar APIFactory para obter facade
      const productFacade = APIFactory.getProductFacade();
      
      // Chamar o método addProduct da facade
      await productFacade.addProduct({
        name: requestData.name,
        description: requestData.description,
        purchasePrice: requestData.purchasePrice,
        stock: requestData.stock
      });

      const response: CreateProductResponseDto = {
        message: 'Product created successfully'
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('ProductController.create error:', error);
      
      // Criar erro padronizado
      const apiError = createError(
        error.message || 'Failed to create product',
        500,
        { originalError: error.message }
      );
      
      next(apiError);
    }
  }
}
