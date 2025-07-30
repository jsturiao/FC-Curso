// Checkout DTOs para API
export interface ProductOrderDto {
  productId: string;
}

export interface PlaceOrderRequestDto {
  clientId: string;
  products: ProductOrderDto[];
}

export interface PlaceOrderResponseDto {
  id: string;
  invoiceId: string | null;
  status: string;
  total: number;
  products: {
    productId: string;
  }[];
}

// Validation schemas
export const placeOrderValidation = {
  body: (data: any) => {
    const errors: string[] = [];
    
    if (!data.clientId || typeof data.clientId !== 'string') {
      errors.push('clientId is required and must be a string');
    }
    
    if (!Array.isArray(data.products)) {
      errors.push('products is required and must be an array');
    } else {
      if (data.products.length === 0) {
        errors.push('products array cannot be empty');
      }
      
      data.products.forEach((product: any, index: number) => {
        if (!product.productId || typeof product.productId !== 'string') {
          errors.push(`products[${index}].productId is required and must be a string`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};
