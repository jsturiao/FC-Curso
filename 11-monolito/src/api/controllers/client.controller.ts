import { Request, Response, NextFunction } from 'express';
import APIFactory from '../../factories/api.factory';
import Address from '../../modules/@shared/domain/value-object/address';
import { CreateClientRequestDto, CreateClientResponseDto } from '../dtos/client.dto';
import { createError } from '../middlewares/error-handler.middleware';

export default class ClientController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestData: CreateClientRequestDto = req.body;
      
      // Usar APIFactory para obter facade
      const clientFacade = APIFactory.getClientFacade();
      
      // Criar objeto Address
      const address = new Address(
        requestData.address.street,
        requestData.address.number,
        requestData.address.complement,
        requestData.address.city,
        requestData.address.state,
        requestData.address.zipCode
      );
      
      // Chamar o método add da facade
      await clientFacade.add({
        name: requestData.name,
        email: requestData.email,
        document: requestData.document,
        address: address
      });

      const response: CreateClientResponseDto = {
        message: 'Client created successfully'
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('ClientController.create error:', error);
      
      // Verificar se é erro de validação ou negócio
      let statusCode = 500;
      let message = error.message || 'Failed to create client';
      
      // Se for erro de email duplicado ou documento já existente
      if (error.message && (
        error.message.includes('email') || 
        error.message.includes('document') ||
        error.message.includes('unique') ||
        error.message.includes('already exists')
      )) {
        statusCode = 409; // Conflict
        message = 'Client with this email or document already exists';
      }
      
      const apiError = createError(message, statusCode, { originalError: error.message });
      next(apiError);
    }
  }
}
