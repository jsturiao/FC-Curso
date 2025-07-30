import request from 'supertest';
import app from '../../index';
import { setupDatabase, clearDatabase, closeDatabase } from '../setup/test-setup';

describe('Clients API E2E Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /clients', () => {
    it('should create a client successfully', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        document: '123456789',
        address: {
          street: 'Main Street',
          number: '123',
          complement: 'Apt 1',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        }
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Client created successfully'
      });
    });

    it('should return validation error for missing name', async () => {
      const clientData = {
        email: 'john@example.com',
        document: '123456789',
        address: {
          street: 'Main Street',
          number: '123',
          complement: 'Apt 1',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        }
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: name is required and must be a string');
    });

    it('should return validation error for invalid email', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'invalid-email',
        document: '123456789',
        address: {
          street: 'Main Street',
          number: '123',
          complement: 'Apt 1',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        }
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: email must be a valid email address');
    });

    it('should return validation error for missing document', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        address: {
          street: 'Main Street',
          number: '123',
          complement: 'Apt 1',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        }
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: document is required and must be a string');
    });

    it('should return validation error for missing address', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        document: '123456789'
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: address is required and must be an object');
    });

    it('should return validation error for incomplete address', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        document: '123456789',
        address: {
          street: 'Main Street',
          number: '123'
          // missing complement, city, state, zipCode
        }
      };

      const response = await request(app)
        .post('/clients')
        .send(clientData)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Body: address.complement is required and must be a string');
      expect(response.body.details.validationErrors).toContain('Body: address.city is required and must be a string');
      expect(response.body.details.validationErrors).toContain('Body: address.state is required and must be a string');
      expect(response.body.details.validationErrors).toContain('Body: address.zipCode is required and must be a string');
    });

    it('should return validation error for empty request body', async () => {
      const response = await request(app)
        .post('/clients')
        .send({})
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.message).toBe('Validation failed');
    });
  });
});
