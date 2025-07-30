import { Request, Response, NextFunction } from 'express';
import APIFactory from '../../factories/api.factory';
import { FindInvoiceResponseDto } from '../dtos/invoice.dto';
import { createError } from '../middlewares/error-handler.middleware';

export default class InvoiceController {
  static async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Usar APIFactory para obter facade
      const invoiceFacade = APIFactory.getInvoiceFacade();
      
      // Buscar a invoice
      const invoice = await invoiceFacade.find({ id });
      
      if (!invoice) {
        const error = createError('Invoice not found', 404);
        return next(error);
      }
      
      // Mapear o resultado para o DTO de resposta da API
      const response: FindInvoiceResponseDto = {
        id: invoice.id,
        name: invoice.name,
        document: invoice.document,
        address: {
          street: invoice.address.street,
          number: invoice.address.number,
          complement: invoice.address.complement,
          city: invoice.address.city,
          state: invoice.address.state,
          zipCode: invoice.address.zipCode
        },
        items: invoice.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price
        })),
        total: invoice.total,
        createdAt: invoice.createdAt
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('InvoiceController.findById error:', error);
      
      // Verificar se é erro de not found específico
      let statusCode = 500;
      let message = error.message || 'Failed to find invoice';
      
      if (error.message && (
        error.message.includes('not found') ||
        error.message.includes('does not exist') ||
        error.message.includes('Invoice not found')
      )) {
        statusCode = 404;
        message = 'Invoice not found';
      }
      
      const apiError = createError(message, statusCode, { originalError: error.message });
      next(apiError);
    }
  }
}
