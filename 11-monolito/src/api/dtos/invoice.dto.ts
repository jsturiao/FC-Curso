// Invoice DTOs para API
export interface InvoiceItemDto {
  id: string;
  name: string;
  price: number;
}

export interface InvoiceAddressDto {
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface FindInvoiceResponseDto {
  id: string;
  name: string;
  document: string;
  address: InvoiceAddressDto;
  items: InvoiceItemDto[];
  total: number;
  createdAt: Date;
}

// Validation schemas
export const findInvoiceValidation = {
  params: (data: any) => {
    const errors: string[] = [];
    
    if (!data.id || typeof data.id !== 'string') {
      errors.push('id parameter is required and must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};
