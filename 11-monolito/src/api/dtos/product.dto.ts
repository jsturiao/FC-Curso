// Product DTOs para API
export interface CreateProductRequestDto {
  name: string;
  description: string;
  purchasePrice: number;
  stock: number;
}

export interface CreateProductResponseDto {
  message: string;
}

// Validation schemas
export const createProductValidation = {
  body: (data: any) => {
    const errors: string[] = [];
    
    if (!data.name || typeof data.name !== 'string') {
      errors.push('name is required and must be a string');
    }
    
    if (!data.description || typeof data.description !== 'string') {
      errors.push('description is required and must be a string');
    }
    
    if (typeof data.purchasePrice !== 'number' || data.purchasePrice <= 0) {
      errors.push('purchasePrice is required and must be a positive number');
    }
    
    if (typeof data.stock !== 'number' || data.stock < 0 || !Number.isInteger(data.stock)) {
      errors.push('stock is required and must be a non-negative integer');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};
