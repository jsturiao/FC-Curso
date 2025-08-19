const express = require('express');
const notificationController = require('./controller');
const logger = require('../shared/utils/logger');

const router = express.Router();

// Middleware for logging requests
router.use((req, res, next) => {
  logger.info(`Notifications API: ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Test endpoints for email notifications
router.post('/email/test', notificationController.sendTestEmail);

// Test endpoints for SMS notifications
router.post('/sms/test', notificationController.sendTestSMS);

// Push notification management
router.post('/push/subscribe', notificationController.subscribePush);
router.post('/push/test', notificationController.sendTestPush);
router.delete('/push/subscribe/:userId', notificationController.unsubscribePush);

// Service information endpoints
router.get('/stats', notificationController.getStats);
router.get('/health', notificationController.getHealth);

// Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Notifications API',
    version: '1.0.0',
    description: 'E-commerce notification system with email, SMS, and push notification support',
    endpoints: {
      'POST /email/test': 'Send test email notification',
      'POST /sms/test': 'Send test SMS notification',
      'POST /push/subscribe': 'Subscribe to push notifications',
      'POST /push/test': 'Send test push notification',
      'DELETE /push/subscribe/:userId': 'Unsubscribe from push notifications',
      'GET /stats': 'Get notification service statistics',
      'GET /health': 'Get service health status'
    },
    examples: {
      testEmail: {
        endpoint: 'POST /notifications/email/test',
        body: {
          to: 'customer@example.com',
          template: 'order-confirmation',
          data: {
            customerName: 'John Doe',
            orderId: 'ORD-123',
            total: 99.99,
            currency: 'USD'
          }
        }
      },
      testSMS: {
        endpoint: 'POST /notifications/sms/test',
        body: {
          to: '+1234567890',
          type: 'order-alert',
          data: {
            orderId: 'ORD-123',
            status: 'confirmed'
          }
        }
      },
      subscribePush: {
        endpoint: 'POST /notifications/push/subscribe',
        body: {
          userId: 'user123',
          endpoint: 'https://fcm.googleapis.com/fcm/send/...',
          keys: {
            p256dh: 'key-data...',
            auth: 'auth-data...'
          }
        }
      },
      testPush: {
        endpoint: 'POST /notifications/push/test',
        body: {
          userId: 'user123',
          type: 'order-update',
          data: {
            orderId: 'ORD-123',
            title: 'Order Update',
            message: 'Your order has been shipped!'
          }
        }
      }
    },
    channels: {
      email: {
        provider: 'simulation',
        templates: ['order-confirmation', 'payment-success', 'payment-failed', 'order-status-update'],
        features: ['HTML templates', 'Customer data merge', 'Delivery tracking']
      },
      sms: {
        provider: 'simulation',
        types: ['order-alert', 'payment-alert', 'delivery-notification', 'otp', 'promotion'],
        features: ['International support', 'Character optimization', 'Delivery status']
      },
      push: {
        provider: 'simulation',
        types: ['order-update', 'payment-notification', 'promotion', 'inventory-alert'],
        features: ['Rich notifications', 'Action buttons', 'Deep linking']
      }
    }
  });
});

module.exports = router;
