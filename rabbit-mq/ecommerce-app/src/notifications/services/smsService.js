const logger = require('../../shared/utils/logger');

class SMSService {
  constructor() {
    this.config = {
      provider: process.env.SMS_PROVIDER || 'simulation',
      from: process.env.SMS_FROM || 'Ecommerce'
    };
  }

  /**
   * Send order alert SMS
   */
  async sendOrderAlert(orderData) {
    try {
      const { orderId, customerPhone, customerName, status, trackingNumber } = orderData;

      const message = this.buildOrderMessage(orderId, status, trackingNumber);

      await this.sendSMS({
        to: customerPhone,
        message,
        type: 'order-alert'
      });

      logger.info('Order alert SMS sent', {
        orderId,
        customerPhone: this.maskPhone(customerPhone),
        status
      });

      return {
        success: true,
        messageId: `sms-order-${orderId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending order alert SMS:', error);
      throw error;
    }
  }

  /**
   * Send payment alert SMS
   */
  async sendPaymentAlert(paymentData) {
    try {
      const { orderId, paymentId, customerPhone, amount, currency, status } = paymentData;

      const message = this.buildPaymentMessage(orderId, amount, currency, status);

      await this.sendSMS({
        to: customerPhone,
        message,
        type: 'payment-alert'
      });

      logger.info('Payment alert SMS sent', {
        orderId,
        paymentId,
        customerPhone: this.maskPhone(customerPhone),
        status
      });

      return {
        success: true,
        messageId: `sms-payment-${paymentId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending payment alert SMS:', error);
      throw error;
    }
  }

  /**
   * Send delivery notification SMS
   */
  async sendDeliveryNotification(deliveryData) {
    try {
      const { orderId, customerPhone, trackingNumber, estimatedDelivery } = deliveryData;

      const message = `Your order #${orderId} is out for delivery! Tracking: ${trackingNumber}. Expected delivery: ${estimatedDelivery}. Thank you for shopping with us!`;

      await this.sendSMS({
        to: customerPhone,
        message,
        type: 'delivery-notification'
      });

      logger.info('Delivery notification SMS sent', {
        orderId,
        customerPhone: this.maskPhone(customerPhone),
        trackingNumber
      });

      return {
        success: true,
        messageId: `sms-delivery-${orderId}-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending delivery notification SMS:', error);
      throw error;
    }
  }

  /**
   * Send OTP SMS for verification
   */
  async sendOTP(otpData) {
    try {
      const { customerPhone, otp, expiryMinutes = 5 } = otpData;

      const message = `Your verification code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Do not share this code with anyone.`;

      await this.sendSMS({
        to: customerPhone,
        message,
        type: 'otp'
      });

      logger.info('OTP SMS sent', {
        customerPhone: this.maskPhone(customerPhone),
        expiryMinutes
      });

      return {
        success: true,
        messageId: `sms-otp-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending OTP SMS:', error);
      throw error;
    }
  }

  /**
   * Send promotional SMS
   */
  async sendPromotion(promoData) {
    try {
      const { customerPhone, promoCode, discount, validUntil } = promoData;

      const message = `🎉 Special offer! Get ${discount}% off with code ${promoCode}. Valid until ${validUntil}. Shop now at our store!`;

      await this.sendSMS({
        to: customerPhone,
        message,
        type: 'promotion'
      });

      logger.info('Promotional SMS sent', {
        customerPhone: this.maskPhone(customerPhone),
        promoCode,
        discount
      });

      return {
        success: true,
        messageId: `sms-promo-${Date.now()}`,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending promotional SMS:', error);
      throw error;
    }
  }

  /**
   * Internal method to send SMS
   */
  async sendSMS(smsData) {
    const { to, message, type } = smsData;

    // Validate phone number format
    if (!this.isValidPhoneNumber(to)) {
      throw new Error('Invalid phone number format');
    }

    // Check message length (SMS limit is typically 160 characters)
    if (message.length > 160) {
      logger.warn('SMS message exceeds 160 characters', {
        length: message.length,
        type
      });
    }

    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    if (this.config.provider === 'simulation') {
      logger.info('📱 SMS SIMULATION', {
        provider: 'simulation',
        to: this.maskPhone(to),
        message,
        type,
        length: message.length,
        sentAt: new Date().toISOString()
      });

      // Simulate occasional failures for testing
      if (Math.random() < 0.03) { // 3% failure rate
        throw new Error('Simulated SMS delivery failure');
      }

      return {
        messageId: `sim-sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
        segmentCount: Math.ceil(message.length / 160)
      };
    }

    // Here you would integrate with real SMS providers like:
    // - Twilio
    // - AWS SNS
    // - MessageBird
    // - Nexmo/Vonage
    
    throw new Error(`SMS provider '${this.config.provider}' not implemented`);
  }

  /**
   * Build order status message
   */
  buildOrderMessage(orderId, status, trackingNumber) {
    const messages = {
      'confirmed': `Your order #${orderId} has been confirmed! We'll notify you when it ships.`,
      'processing': `Your order #${orderId} is being prepared for shipment.`,
      'shipped': `Your order #${orderId} has been shipped! Tracking: ${trackingNumber}`,
      'delivered': `Your order #${orderId} has been delivered. Thank you for shopping with us!`,
      'cancelled': `Your order #${orderId} has been cancelled. Contact support if you have questions.`
    };

    return messages[status] || `Your order #${orderId} status: ${status}`;
  }

  /**
   * Build payment status message
   */
  buildPaymentMessage(orderId, amount, currency, status) {
    if (status === 'succeeded') {
      return `Payment confirmed! ${currency} ${amount} for order #${orderId}. Your order is being processed.`;
    } else {
      return `Payment failed for order #${orderId}. Please try again or contact support.`;
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone) {
    // Basic phone number validation (supports international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Mask phone number for logging
   */
  maskPhone(phone) {
    if (!phone || phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
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

module.exports = new SMSService();
