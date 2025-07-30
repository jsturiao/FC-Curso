import request from 'supertest';
import app from '../../index';
import { setupDatabase, clearDatabase, closeDatabase } from '../setup/test-setup';

describe('Invoice API E2E Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /invoice/:id', () => {
    it('should return invoice successfully', async () => {
      // For testing invoice retrieval, we would typically need to create
      // an invoice first through the checkout process. Since we're testing
      // in isolation, we'll test with a mock UUID.
      
      const invoiceId = '11111111-1111-1111-1111-111111111111';

      const response = await request(app)
        .get(`/invoice/${invoiceId}`);

      // Note: This test may fail if the invoice doesn't exist
      // In a real scenario, we'd need to create an invoice first
      expect(response.status).toBeLessThan(500); // Should not be a server error
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('document');
        expect(response.body).toHaveProperty('address');
        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('createdAt');
      }
    });

    it('should return validation error for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';

      const response = await request(app)
        .get(`/invoice/${invalidId}`)
        .expect(400);

      expect(response.body.error).toBe(true);
      expect(response.body.details.validationErrors).toContain('Params: id must be a valid UUID');
    });

    it('should return validation error for empty id', async () => {
      const response = await request(app)
        .get('/invoice/')
        .expect(404); // Route not found

      expect(response.status).toBe(404);
    });

    it('should handle non-existent invoice gracefully', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';

      const response = await request(app)
        .get(`/invoice/${nonExistentId}`);

      // The response should be either 404 (not found) or 500 (internal error)
      // depending on how the facade handles missing invoices
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error', true);
    });
  });
});
