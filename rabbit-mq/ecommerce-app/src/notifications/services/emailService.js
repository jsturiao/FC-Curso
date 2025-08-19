const logger = require('../../shared/utils/logger');

class EmailService {
  constructor() {
    this.config = {
      provider: process.env.EMAIL_PROVIDER || 'simulation',
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.local'
    };
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData) {
    try {
      const { orderId, customerEmail, customerName, total, currency, items } = orderData;

      const emailData = {
        to: customerEmail,
        subject: `Order Confirmation - Order #${orderId}`,
        template: 'order-confirmation',
        data: {
          customerName,
          orderId,
          total,
          currency,
          items,
          orderDate: new Date().toLocaleDateString(),
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      };

      await this.sendEmail(emailData);
      
      logger.info('Order confirmation email sent', {
        orderId,
        customerEmail,
        template: 'order-confirmation'
      });

      return {
        success: true,
        messageId: `order-conf-${orderId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending order confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(paymentData) {
    try {
      const { 
        orderId, 
        paymentId, 
        customerEmail, 
        customerName, 
        amount, 
        currency, 
        paymentMethod,
        status 
      } = paymentData;

      const emailData = {
        to: customerEmail,
        subject: `Payment ${status === 'succeeded' ? 'Confirmed' : 'Failed'} - Order #${orderId}`,
        template: status === 'succeeded' ? 'payment-success' : 'payment-failed',
        data: {
          customerName,
          orderId,
          paymentId,
          amount,
          currency,
          paymentMethod,
          status,
          paymentDate: new Date().toLocaleDateString(),
          nextSteps: status === 'succeeded' 
            ? 'Your order is now being processed and will be shipped soon.'
            : 'Please try again or contact customer support for assistance.'
        }
      };

      await this.sendEmail(emailData);
      
      logger.info('Payment confirmation email sent', {
        orderId,
        paymentId,
        customerEmail,
        status,
        template: emailData.template
      });

      return {
        success: true,
        messageId: `payment-conf-${paymentId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending payment confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(orderData) {
    try {
      const { orderId, customerEmail, customerName, status, trackingNumber } = orderData;

      const emailData = {
        to: customerEmail,
        subject: `Order Update - Order #${orderId} is now ${status}`,
        template: 'order-status-update',
        data: {
          customerName,
          orderId,
          status,
          trackingNumber,
          updateDate: new Date().toLocaleDateString(),
          statusMessage: this.getStatusMessage(status)
        }
      };

      await this.sendEmail(emailData);
      
      logger.info('Order status update email sent', {
        orderId,
        customerEmail,
        status
      });

      return {
        success: true,
        messageId: `order-update-${orderId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending order status update email:', error);
      throw error;
    }
  }

  /**
   * Send inventory alert email
   */
  async sendInventoryAlert(inventoryData) {
    try {
      const { productId, productName, currentStock, threshold, customerEmail } = inventoryData;

      const emailData = {
        to: customerEmail,
        subject: `Product Back in Stock - ${productName}`,
        template: 'inventory-alert',
        data: {
          productName,
          productId,
          currentStock,
          restockDate: new Date().toLocaleDateString()
        }
      };

      await this.sendEmail(emailData);
      
      logger.info('Inventory alert email sent', {
        productId,
        customerEmail
      });

      return {
        success: true,
        messageId: `inventory-alert-${productId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending inventory alert email:', error);
      throw error;
    }
  }

  /**
   * Internal method to send email
   */
  async sendEmail(emailData) {
    const { to, subject, template, data } = emailData;

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    if (this.config.provider === 'simulation') {
      logger.info('📧 EMAIL SIMULATION', {
        provider: 'simulation',
        to,
        subject,
        template,
        data: JSON.stringify(data, null, 2),
        sentAt: new Date().toISOString()
      });

      // Simulate occasional failures for testing
      if (Math.random() < 0.05) { // 5% failure rate
        throw new Error('Simulated email delivery failure');
      }

      return {
        messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent'
      };
    }

    // Here you would integrate with real email providers like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer + SMTP
    
    throw new Error(`Email provider '${this.config.provider}' not implemented`);
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(status) {
    const messages = {
      'pending': 'Your order is being processed',
      'confirmed': 'Your order has been confirmed',
      'processing': 'Your order is being prepared',
      'shipped': 'Your order has been shipped',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };

    return messages[status] || `Your order status has been updated to ${status}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      provider: this.config.provider,
      from: this.config.from,
      status: 'active',
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = new EmailService();
