import request from 'supertest';
import app from '../../index';
import { setupDatabase, clearDatabase, closeDatabase } from '../setup/test-setup';

describe('Products API E2E Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /products', () => {
    it('should create a product successfully', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        purchasePrice: 100.50,
        stock: 10
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Product created successfully'
      });
    });

    it('should return validation error for missing name', async () => {
      const productData = {
        description: 'Test Description',
        purchasePrice: 100.50,
        stock: 10
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details.validationErrors).toContain('Body: name is required and must be a string');
    });

    it('should return validation error for missing description', async () => {
      const productData = {
        name: 'Test Product',
        purchasePrice: 100.50,
        stock: 10
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: description is required and must be a string');
    });

    it('should return validation error for invalid purchase price', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        purchasePrice: -10,
        stock: 10
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: purchasePrice is required and must be a positive number');
    });

    it('should return validation error for invalid stock', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        purchasePrice: 100.50,
        stock: -5
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: stock is required and must be a non-negative integer');
    });

    it('should return validation error for non-integer stock', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        purchasePrice: 100.50,
        stock: 5.5
      };

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: stock is required and must be a non-negative integer');
    });

    it('should return validation error for empty request body', async () => {
      const response = await request(app)
        .post('/products')
        .send({})
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Validation failed');
    });
  });
});
