const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const pushNotificationService = require('./services/pushNotificationService');
const logger = require('../shared/utils/logger');
const Joi = require('joi');

class NotificationController {
  /**
   * Send test email notification
   */
  async sendTestEmail(req, res) {
    try {
      const schema = Joi.object({
        to: Joi.string().email().required(),
        template: Joi.string().valid('order-confirmation', 'payment-success', 'payment-failed', 'order-status-update').required(),
        data: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { to, template, data } = value;

      // Mock data for testing
      const mockData = {
        customerName: data.customerName || 'John Doe',
        orderId: data.orderId || 'TEST-' + Date.now(),
        paymentId: data.paymentId || 'PAY-' + Date.now(),
        total: data.total || 99.99,
        currency: data.currency || 'USD',
        amount: data.amount || 99.99,
        paymentMethod: data.paymentMethod || 'Credit Card',
        status: data.status || 'succeeded',
        trackingNumber: data.trackingNumber || 'TRACK123456',
        orderDate: new Date().toLocaleDateString(),
        paymentDate: new Date().toLocaleDateString(),
        updateDate: new Date().toLocaleDateString(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        items: data.items || [
          { name: 'Test Product 1', quantity: 1, price: 49.99 },
          { name: 'Test Product 2', quantity: 2, price: 25.00 }
        ]
      };

      let result;
      switch (template) {
        case 'order-confirmation':
          result = await emailService.sendOrderConfirmation({
            ...mockData,
            customerEmail: to
          });
          break;
        case 'payment-success':
        case 'payment-failed':
          result = await emailService.sendPaymentConfirmation({
            ...mockData,
            customerEmail: to
          });
          break;
        case 'order-status-update':
          result = await emailService.sendOrderStatusUpdate({
            ...mockData,
            customerEmail: to
          });
          break;
      }

      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send test SMS notification
   */
  async sendTestSMS(req, res) {
    try {
      const schema = Joi.object({
        to: Joi.string().required(),
        type: Joi.string().valid('order-alert', 'payment-alert', 'delivery-notification', 'otp', 'promotion').required(),
        data: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { to, type, data } = value;

      // Mock data for testing
      const mockData = {
        customerPhone: to,
        orderId: data.orderId || 'TEST-' + Date.now(),
        paymentId: data.paymentId || 'PAY-' + Date.now(),
        amount: data.amount || 99.99,
        currency: data.currency || 'USD',
        status: data.status || 'confirmed',
        trackingNumber: data.trackingNumber || 'TRACK123456',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        otp: data.otp || Math.floor(100000 + Math.random() * 900000).toString(),
        promoCode: data.promoCode || 'SAVE20',
        discount: data.discount || 20,
        validUntil: data.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

      let result;
      switch (type) {
        case 'order-alert':
          result = await smsService.sendOrderAlert(mockData);
          break;
        case 'payment-alert':
          result = await smsService.sendPaymentAlert(mockData);
          break;
        case 'delivery-notification':
          result = await smsService.sendDeliveryNotification(mockData);
          break;
        case 'otp':
          result = await smsService.sendOTP(mockData);
          break;
        case 'promotion':
          result = await smsService.sendPromotion(mockData);
          break;
      }

      res.json({
        success: true,
        message: 'Test SMS sent successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error sending test SMS:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribePush(req, res) {
    try {
      const schema = Joi.object({
        userId: Joi.string().required(),
        endpoint: Joi.string().uri().required(),
        keys: Joi.object({
          p256dh: Joi.string().required(),
          auth: Joi.string().required()
        }).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await pushNotificationService.subscribe(value);

      res.json({
        success: true,
        message: 'Successfully subscribed to push notifications',
        data: result
      });

    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send test push notification
   */
  async sendTestPush(req, res) {
    try {
      const schema = Joi.object({
        userId: Joi.string().required(),
        type: Joi.string().valid('order-update', 'payment-notification', 'promotion', 'inventory-alert').required(),
        data: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { userId, type, data } = value;

      // Mock data for testing
      const mockData = {
        userId,
        orderId: data.orderId || 'TEST-' + Date.now(),
        paymentId: data.paymentId || 'PAY-' + Date.now(),
        productId: data.productId || 'PROD-123',
        productName: data.productName || 'Test Product',
        title: data.title || 'Test Notification',
        message: data.message || 'This is a test push notification',
        status: data.status || 'succeeded'
      };

      let result;
      switch (type) {
        case 'order-update':
          result = await pushNotificationService.sendOrderUpdate(mockData);
          break;
        case 'payment-notification':
          result = await pushNotificationService.sendPaymentNotification(mockData);
          break;
        case 'promotion':
          result = await pushNotificationService.sendPromotion({
            userIds: [userId],
            title: mockData.title,
            message: mockData.message,
            promoCode: 'SAVE20',
            discount: 20
          });
          break;
        case 'inventory-alert':
          result = await pushNotificationService.sendInventoryAlert(mockData);
          break;
      }

      res.json({
        success: true,
        message: 'Test push notification sent successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error sending test push notification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get notification service statistics
   */
  async getStats(req, res) {
    try {
      const stats = {
        email: emailService.getStats(),
        sms: smsService.getStats(),
        push: pushNotificationService.getStats(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting notification stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get service health status
   */
  async getHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        services: {
          email: 'operational',
          sms: 'operational',
          push: 'operational'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error('Error getting notification health:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribePush(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await pushNotificationService.unsubscribe(userId);

      res.json({
        success: true,
        message: 'Successfully unsubscribed from push notifications',
        data: result
      });

    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();
