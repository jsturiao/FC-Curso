import { Request, Response, NextFunction } from 'express';
import { createError } from './error-handler.middleware';

export interface ValidationSchema {
  body?: (data: any) => ValidationResult;
  params?: (data: any) => ValidationResult;
  query?: (data: any) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validar body
    if (schema.body) {
      const bodyValidation = schema.body(req.body);
      if (!bodyValidation.isValid && bodyValidation.errors) {
        errors.push(...bodyValidation.errors.map(err => `Body: ${err}`));
      }
    }

    // Validar params
    if (schema.params) {
      const paramsValidation = schema.params(req.params);
      if (!paramsValidation.isValid && paramsValidation.errors) {
        errors.push(...paramsValidation.errors.map(err => `Params: ${err}`));
      }
    }

    // Validar query
    if (schema.query) {
      const queryValidation = schema.query(req.query);
      if (!queryValidation.isValid && queryValidation.errors) {
        errors.push(...queryValidation.errors.map(err => `Query: ${err}`));
      }
    }

    if (errors.length > 0) {
      const error = createError('Validation failed', 400, { validationErrors: errors });
      return next(error);
    }

    next();
  };
}

// Utilitários de validação
export const validators = {
  required: (value: any, fieldName: string): string | null => {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  string: (value: any, fieldName: string): string | null => {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    return null;
  },

  number: (value: any, fieldName: string): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`;
    }
    return null;
  },

  positiveNumber: (value: any, fieldName: string): string | null => {
    const numberError = validators.number(value, fieldName);
    if (numberError) return numberError;
    
    if (value <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },

  email: (value: any, fieldName: string): string | null => {
    const stringError = validators.string(value, fieldName);
    if (stringError) return stringError;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return null;
  },

  uuid: (value: any, fieldName: string): string | null => {
    const stringError = validators.string(value, fieldName);
    if (stringError) return stringError;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return `${fieldName} must be a valid UUID`;
    }
    return null;
  },

  array: (value: any, fieldName: string): string | null => {
    if (!Array.isArray(value)) {
      return `${fieldName} must be an array`;
    }
    return null;
  },

  object: (value: any, fieldName: string): string | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${fieldName} must be an object`;
    }
    return null;
  }
};

export function validate(data: any, rules: Array<(data: any) => string | null>): ValidationResult {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const error = rule(data);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
