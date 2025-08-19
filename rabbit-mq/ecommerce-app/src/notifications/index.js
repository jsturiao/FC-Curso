const NotificationEventSubscriber = require('./events/subscriber');
const NotificationRoutes = require('./routes');
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const pushNotificationService = require('./services/pushNotificationService');
const logger = require('../shared/utils/logger');

class NotificationModule {
  /**
   * Initialize notification module
   */
  static async initialize() {
    try {
      logger.info('Initializing Notification Module...');

      // Initialize event subscriber
      await NotificationEventSubscriber.initialize();

      // Initialize services
      logger.info('Notification services initialized:', {
        email: emailService.getStats(),
        sms: smsService.getStats(),
        push: pushNotificationService.getStats()
      });

      logger.info('Notification Module initialized successfully');

      return {
        routes: NotificationRoutes,
        subscribers: NotificationEventSubscriber,
        services: {
          email: emailService,
          sms: smsService,
          push: pushNotificationService
        }
      };

    } catch (error) {
      logger.error('Error initializing Notification Module:', error);
      throw error;
    }
  }

  /**
   * Get module information
   */
  static getModuleInfo() {
    return {
      name: 'Notification Module',
      version: '1.0.0',
      description: 'Comprehensive notification system with multi-channel support',
      features: [
        'Email notifications with HTML templates',
        'SMS notifications with international support',
        'Push notifications with rich content',
        'Event-driven architecture',
        'Template management',
        'Delivery tracking',
        'Multi-channel campaign support',
        'Real-time notification status'
      ],
      channels: [
        'Email (SMTP/API providers)',
        'SMS (Twilio/AWS SNS)',
        'Push Notifications (FCM/APNs)',
        'In-app notifications',
        'WebSocket real-time alerts'
      ],
      events: {
        subscribes: [
          'order.created',
          'payment.succeeded',
          'payment.failed',
          'order.status.updated',
          'inventory.reserved',
          'inventory.back.in.stock',
          'promotional.campaign'
        ],
        publishes: [
          'notification.email.sent',
          'notification.sms.sent',
          'notification.push.sent',
          'notification.delivery.failed'
        ]
      },
      apis: {
        'POST /notifications/email/test': 'Send test email',
        'POST /notifications/sms/test': 'Send test SMS',
        'POST /notifications/push/subscribe': 'Subscribe to push notifications',
        'POST /notifications/push/test': 'Send test push notification',
        'GET /notifications/stats': 'Get service statistics',
        'GET /notifications/health': 'Get service health'
      },
      configuration: {
        email: {
          provider: process.env.EMAIL_PROVIDER || 'simulation',
          from: process.env.EMAIL_FROM || 'noreply@ecommerce.local'
        },
        sms: {
          provider: process.env.SMS_PROVIDER || 'simulation',
          from: process.env.SMS_FROM || 'Ecommerce'
        },
        push: {
          provider: process.env.PUSH_PROVIDER || 'simulation',
          vapidKeys: {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
          }
        }
      }
    };
  }

  /**
   * Get service statistics
   */
  static getStats() {
    return {
      email: emailService.getStats(),
      sms: smsService.getStats(),
      push: pushNotificationService.getStats(),
      module: {
        status: 'active',
        uptime: process.uptime(),
        lastCheck: new Date().toISOString()
      }
    };
  }

  /**
   * Get service health
   */
  static async getHealth() {
    try {
      const health = {
        status: 'healthy',
        services: {
          email: 'operational',
          sms: 'operational',
          push: 'operational'
        },
        checks: {
          emailService: emailService.getStats().status === 'active',
          smsService: smsService.getStats().status === 'active',
          pushService: pushNotificationService.getStats().status === 'active'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      return health;

    } catch (error) {
      logger.error('Error checking notification module health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send test notifications (for testing purposes)
   */
  static async sendTestNotifications() {
    try {
      const testData = {
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        customerId: 'test-user-123',
        customerName: 'Test Customer',
        orderId: 'TEST-' + Date.now(),
        paymentId: 'PAY-' + Date.now(),
        total: 99.99,
        currency: 'USD',
        amount: 99.99,
        paymentMethod: 'Credit Card',
        status: 'succeeded',
        items: [
          { name: 'Test Product 1', quantity: 1, price: 49.99 },
          { name: 'Test Product 2', quantity: 2, price: 25.00 }
        ]
      };

      const results = await Promise.allSettled([
        emailService.sendOrderConfirmation(testData),
        smsService.sendOrderAlert(testData),
        pushNotificationService.sendOrderUpdate({
          userId: testData.customerId,
          orderId: testData.orderId,
          title: 'Test Order Update',
          message: 'This is a test notification from the notification module'
        })
      ]);

      logger.info('Test notifications sent:', {
        email: results[0].status === 'fulfilled',
        sms: results[1].status === 'fulfilled',
        push: results[2].status === 'fulfilled'
      });

      return results;

    } catch (error) {
      logger.error('Error sending test notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationModule;
