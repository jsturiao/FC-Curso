// Client DTOs para API
export interface AddressDto {
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreateClientRequestDto {
  name: string;
  email: string;
  document: string;
  address: AddressDto;
}

export interface CreateClientResponseDto {
  message: string;
}

// Validation schemas
export const createClientValidation = {
  body: (data: any) => {
    const errors: string[] = [];
    
    if (!data.name || typeof data.name !== 'string') {
      errors.push('name is required and must be a string');
    }
    
    if (!data.email || typeof data.email !== 'string') {
      errors.push('email is required and must be a string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('email must be a valid email address');
      }
    }
    
    if (!data.document || typeof data.document !== 'string') {
      errors.push('document is required and must be a string');
    }
    
    if (!data.address || typeof data.address !== 'object') {
      errors.push('address is required and must be an object');
    } else {
      const address = data.address;
      
      if (!address.street || typeof address.street !== 'string') {
        errors.push('address.street is required and must be a string');
      }
      
      if (!address.number || typeof address.number !== 'string') {
        errors.push('address.number is required and must be a string');
      }
      
      if (!address.complement || typeof address.complement !== 'string') {
        errors.push('address.complement is required and must be a string');
      }
      
      if (!address.city || typeof address.city !== 'string') {
        errors.push('address.city is required and must be a string');
      }
      
      if (!address.state || typeof address.state !== 'string') {
        errors.push('address.state is required and must be a string');
      }
      
      if (!address.zipCode || typeof address.zipCode !== 'string') {
        errors.push('address.zipCode is required and must be a string');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};
