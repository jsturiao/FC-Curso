const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const pushNotificationService = require('../services/pushNotificationService');
const logger = require('../../shared/utils/logger');
const { EVENTS } = require('../../shared/events/events');

class NotificationEventSubscriber {
  /**
   * Initialize the subscriber
   */
  async initialize() {
    logger.info('Notification Event Subscriber initialized');
  }

  /**
   * Handle order created event
   */
  async handleOrderCreated(message, rawMessage) {
    try {
      const { data } = message;
      const { 
        orderId, 
        customerId, 
        customerEmail, 
        customerName, 
        customerPhone,
        total, 
        currency, 
        items 
      } = data;

      logger.info('Processing order created notification', {
        orderId,
        customerId,
        customerEmail,
        messageId: message.id
      });

      // Send order confirmation email
      if (customerEmail) {
        await emailService.sendOrderConfirmation({
          orderId,
          customerEmail,
          customerName,
          total,
          currency,
          items
        });
      }

      // Send order confirmation SMS
      if (customerPhone) {
        await smsService.sendOrderAlert({
          orderId,
          customerPhone,
          customerName,
          status: 'confirmed'
        });
      }

      // Send push notification
      if (customerId) {
        await pushNotificationService.sendOrderUpdate({
          userId: customerId,
          orderId,
          title: 'Order Confirmed!',
          message: `Your order #${orderId} has been confirmed and is being processed.`,
          data: { total, currency, itemCount: items.length }
        });
      }

      logger.info('Order created notifications sent successfully', {
        orderId,
        channels: {
          email: !!customerEmail,
          sms: !!customerPhone,
          push: !!customerId
        }
      });

    } catch (error) {
      logger.error('Error handling order created notification:', error);
      throw error;
    }
  }

  /**
   * Handle payment processed event
   */
  async handlePaymentProcessed(message, rawMessage) {
    try {
      const { data } = message;
      const { 
        orderId, 
        paymentId,
        customerId,
        customerEmail, 
        customerName, 
        customerPhone,
        amount, 
        currency, 
        paymentMethod,
        status 
      } = data;

      logger.info('Processing payment processed notification', {
        orderId,
        paymentId,
        status,
        messageId: message.id
      });

      // Send payment confirmation email
      if (customerEmail) {
        await emailService.sendPaymentConfirmation({
          orderId,
          paymentId,
          customerEmail,
          customerName,
          amount,
          currency,
          paymentMethod,
          status
        });
      }

      // Send payment SMS alert
      if (customerPhone) {
        await smsService.sendPaymentAlert({
          orderId,
          paymentId,
          customerPhone,
          amount,
          currency,
          status
        });
      }

      // Send push notification
      if (customerId) {
        await pushNotificationService.sendPaymentNotification({
          userId: customerId,
          paymentId,
          orderId,
          title: status === 'succeeded' ? 'Payment Successful!' : 'Payment Failed',
          message: status === 'succeeded' 
            ? `Your payment of ${currency} ${amount} has been processed successfully.`
            : `We couldn't process your payment. Please try again.`,
          status
        });
      }

      logger.info('Payment processed notifications sent successfully', {
        orderId,
        paymentId,
        status,
        channels: {
          email: !!customerEmail,
          sms: !!customerPhone,
          push: !!customerId
        }
      });

    } catch (error) {
      logger.error('Error handling payment processed notification:', error);
      throw error;
    }
  }

  /**
   * Handle order status updated event
   */
  async handleOrderStatusUpdated(message, rawMessage) {
    try {
      const { data } = message;
      const { 
        orderId, 
        customerId,
        customerEmail, 
        customerName, 
        customerPhone,
        status, 
        trackingNumber,
        previousStatus 
      } = data;

      logger.info('Processing order status update notification', {
        orderId,
        status,
        previousStatus,
        messageId: message.id
      });

      // Send status update email
      if (customerEmail) {
        await emailService.sendOrderStatusUpdate({
          orderId,
          customerEmail,
          customerName,
          status,
          trackingNumber
        });
      }

      // Send SMS for important status changes
      if (customerPhone && ['shipped', 'delivered', 'cancelled'].includes(status)) {
        await smsService.sendOrderAlert({
          orderId,
          customerPhone,
          customerName,
          status,
          trackingNumber
        });
      }

      // Send push notification for all status changes
      if (customerId) {
        await pushNotificationService.sendOrderUpdate({
          userId: customerId,
          orderId,
          title: `Order Update: ${status}`,
          message: this.getStatusMessage(status, orderId),
          data: { status, trackingNumber }
        });
      }

      // Special handling for delivery notifications
      if (status === 'shipped' && trackingNumber && customerPhone) {
        await smsService.sendDeliveryNotification({
          orderId,
          customerPhone,
          trackingNumber,
          estimatedDelivery: this.getEstimatedDelivery()
        });
      }

      logger.info('Order status update notifications sent successfully', {
        orderId,
        status,
        channels: {
          email: !!customerEmail,
          sms: !!customerPhone && ['shipped', 'delivered', 'cancelled'].includes(status),
          push: !!customerId
        }
      });

    } catch (error) {
      logger.error('Error handling order status update notification:', error);
      throw error;
    }
  }

  /**
   * Handle inventory reserved event
   */
  async handleInventoryReserved(message, rawMessage) {
    try {
      const { data } = message;
      const { orderId, customerId, reservationId, items } = data;

      logger.info('Processing inventory reserved notification', {
        orderId,
        reservationId,
        messageId: message.id
      });

      // For now, just log the inventory reservation
      // In a real system, you might send notifications for specific scenarios
      logger.info('Inventory reserved for order', {
        orderId,
        reservationId,
        itemCount: items.length
      });

    } catch (error) {
      logger.error('Error handling inventory reserved notification:', error);
      throw error;
    }
  }

  /**
   * Handle inventory back in stock event
   */
  async handleInventoryBackInStock(message, rawMessage) {
    try {
      const { data } = message;
      const { productId, productName, customersToNotify } = data;

      logger.info('Processing inventory back in stock notification', {
        productId,
        productName,
        customersCount: customersToNotify.length,
        messageId: message.id
      });

      // Notify all customers who requested to be notified
      for (const customer of customersToNotify) {
        const { customerId, customerEmail, customerPhone } = customer;

        // Send email notification
        if (customerEmail) {
          await emailService.sendInventoryAlert({
            productId,
            productName,
            customerEmail
          });
        }

        // Send push notification
        if (customerId) {
          await pushNotificationService.sendInventoryAlert({
            userId: customerId,
            productId,
            productName,
            message: `${productName} is back in stock! Get yours before they're gone again.`
          });
        }
      }

      logger.info('Inventory back in stock notifications sent', {
        productId,
        notificationsSent: customersToNotify.length
      });

    } catch (error) {
      logger.error('Error handling inventory back in stock notification:', error);
      throw error;
    }
  }

  /**
   * Handle promotional campaign event
   */
  async handlePromotionalCampaign(message, rawMessage) {
    try {
      const { data } = message;
      const { 
        campaignId, 
        title, 
        message: promoMessage, 
        promoCode, 
        discount, 
        validUntil,
        targetCustomers 
      } = data;

      logger.info('Processing promotional campaign notification', {
        campaignId,
        title,
        targetCount: targetCustomers.length,
        messageId: message.id
      });

      // Send promotional notifications to target customers
      const emailPromises = [];
      const smsPromises = [];
      const pushUserIds = [];

      for (const customer of targetCustomers) {
        const { customerId, customerEmail, customerPhone } = customer;

        // Collect for batch sending
        if (customerEmail) {
          emailPromises.push(
            emailService.sendEmail({
              to: customerEmail,
              subject: title,
              template: 'promotion',
              data: { promoCode, discount, validUntil, message: promoMessage }
            })
          );
        }

        if (customerPhone) {
          smsPromises.push(
            smsService.sendPromotion({
              customerPhone,
              promoCode,
              discount,
              validUntil
            })
          );
        }

        if (customerId) {
          pushUserIds.push(customerId);
        }
      }

      // Send all notifications in parallel
      await Promise.allSettled([
        ...emailPromises,
        ...smsPromises,
        pushNotificationService.sendPromotion({
          userIds: pushUserIds,
          title,
          message: promoMessage,
          promoCode,
          discount
        })
      ]);

      logger.info('Promotional campaign notifications sent', {
        campaignId,
        emails: emailPromises.length,
        sms: smsPromises.length,
        push: pushUserIds.length
      });

    } catch (error) {
      logger.error('Error handling promotional campaign notification:', error);
      throw error;
    }
  }

  /**
   * Get status message for notifications
   */
  getStatusMessage(status, orderId) {
    const messages = {
      'pending': `Your order #${orderId} is being processed`,
      'confirmed': `Your order #${orderId} has been confirmed`,
      'processing': `Your order #${orderId} is being prepared`,
      'shipped': `Your order #${orderId} has been shipped`,
      'delivered': `Your order #${orderId} has been delivered`,
      'cancelled': `Your order #${orderId} has been cancelled`
    };

    return messages[status] || `Your order #${orderId} status has been updated to ${status}`;
  }

  /**
   * Get estimated delivery date
   */
  getEstimatedDelivery() {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3); // 3 days from now
    return deliveryDate.toLocaleDateString();
  }

  /**
   * Get event handlers mapping
   */
  getEventHandlers() {
    return {
      [EVENTS.ORDER_CREATED]: this.handleOrderCreated.bind(this),
      [EVENTS.PAYMENT_SUCCEEDED]: this.handlePaymentProcessed.bind(this),
      [EVENTS.PAYMENT_FAILED]: this.handlePaymentProcessed.bind(this),
      [EVENTS.ORDER_STATUS_UPDATED]: this.handleOrderStatusUpdated.bind(this),
      [EVENTS.INVENTORY_RESERVED]: this.handleInventoryReserved.bind(this),
      [EVENTS.INVENTORY_BACK_IN_STOCK]: this.handleInventoryBackInStock.bind(this),
      [EVENTS.PROMOTIONAL_CAMPAIGN]: this.handlePromotionalCampaign.bind(this)
    };
  }
}

module.exports = new NotificationEventSubscriber();
