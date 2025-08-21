const Order = require('../model');
const orderPublisher = require('./publisher');
const logger = require('../../../shared/utils/logger');
const retryHandler = require('../../../shared/events/RetryHandler');
const { EVENTS } = require('../../../shared/events/events');

class OrderEventSubscriber {
  /**
   * Handle payment processed event with retry
   */
  async handlePaymentProcessedWithRetry(message, rawMessage) {
    return retryHandler.processWithRetry(
      this.handlePaymentProcessed.bind(this),
      message,
      {
        queueName: 'orders.payment_processed',
        correlationId: message.correlationId,
        maxRetries: 3
      }
    );
  }

  /**
   * Handle payment processed event
   */
  async handlePaymentProcessed(message, rawMessage) {
    try {
      const { data } = message;
      const { orderId, paymentId, amount, currency, paymentMethod, transactionId, status } = data;

      logger.info('Processing payment event for order', {
        orderId,
        paymentId,
        status,
        messageId: message.id
      });

      // Find the order
      const order = await Order.findOne({ orderId });
      if (!order) {
        logger.warn('Order not found for payment event', { orderId, paymentId });
        return;
      }

      // Update payment information
      const paymentInfo = {
        paymentId,
        paymentMethod,
        transactionId,
        paymentStatus: status === 'succeeded' ? 'COMPLETED' : 'FAILED'
      };

      order.updatePayment(paymentInfo);
      await order.save();

      logger.info('Order payment info updated', {
        orderId,
        paymentStatus: paymentInfo.paymentStatus
      });

      // If payment succeeded and inventory is reserved, confirm the order
      if (paymentInfo.paymentStatus === 'COMPLETED' && order.inventoryInfo.isReserved) {
        order.confirm();
        await order.save();

        // Publish order confirmed event
        await orderPublisher.publishOrderConfirmed({
          orderId: order.orderId,
          customerId: order.customerId,
          total: order.total,
          currency: order.currency,
          confirmedAt: new Date().toISOString()
        }, {
          correlationId: order.metadata.correlationId,
          causationId: message.id
        });

        // Send confirmation notification
        await orderPublisher.publishOrderNotification({
          type: 'order_confirmed',
          orderId: order.orderId,
          recipient: order.customerEmail,
          subject: `Order ${order.orderId} Confirmed`,
          content: `Your order has been confirmed and will be processed shortly.`,
          orderData: {
            orderId: order.orderId,
            total: order.total,
            currency: order.currency,
            items: order.items
          }
        }, {
          correlationId: order.metadata.correlationId
        });
      }

    } catch (error) {
      logger.error('Error handling payment processed event:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed event
   */
  async handlePaymentFailed(message, rawMessage) {
    try {
      const { data } = message;
      const { orderId, paymentId, reason } = data;

      logger.info('Processing payment failed event for order', {
        orderId,
        paymentId,
        reason,
        messageId: message.id
      });

      // Find the order
      const order = await Order.findOne({ orderId });
      if (!order) {
        logger.warn('Order not found for payment failed event', { orderId, paymentId });
        return;
      }

      // Update payment information
      order.updatePayment({
        paymentId,
        paymentStatus: 'FAILED'
      });

      await order.save();

      logger.info('Order marked as payment failed', { orderId });

      // Send payment failed notification
      await orderPublisher.publishOrderNotification({
        type: 'payment_failed',
        orderId: order.orderId,
        recipient: order.customerEmail,
        subject: `Payment Failed for Order ${order.orderId}`,
        content: `We were unable to process your payment. Please try again or contact support.`,
        orderData: {
          orderId: order.orderId,
          total: order.total,
          currency: order.currency,
          reason
        }
      }, {
        correlationId: order.metadata.correlationId
      });

    } catch (error) {
      logger.error('Error handling payment failed event:', error);
      throw error;
    }
  }

  /**
   * Handle inventory reserved event
   */
  async handleInventoryReserved(message, rawMessage) {
    try {
      const { data } = message;
      const { orderId, reservationId, items, reservedAt } = data;

      logger.info('Processing inventory reserved event for order', {
        orderId,
        reservationId,
        messageId: message.id
      });

      // Find the order
      const order = await Order.findOne({ orderId });
      if (!order) {
        logger.warn('Order not found for inventory reserved event', { orderId, reservationId });
        return;
      }

      // Update inventory information
      order.reserveInventory(reservationId);
      await order.save();

      logger.info('Order inventory reserved', {
        orderId,
        reservationId
      });

      // If payment is already confirmed, confirm the order
      if (order.paymentInfo.paymentStatus === 'COMPLETED') {
        order.confirm();
        await order.save();

        // Publish order confirmed event
        await orderPublisher.publishOrderConfirmed({
          orderId: order.orderId,
          customerId: order.customerId,
          total: order.total,
          currency: order.currency,
          confirmedAt: new Date().toISOString()
        }, {
          correlationId: order.metadata.correlationId,
          causationId: message.id
        });
      }

    } catch (error) {
      logger.error('Error handling inventory reserved event:', error);
      throw error;
    }
  }

  /**
   * Handle inventory insufficient event
   */
  async handleInventoryInsufficient(message, rawMessage) {
    try {
      const { data } = message;
      const { orderId, items, reason } = data;

      logger.info('Processing inventory insufficient event for order', {
        orderId,
        reason,
        messageId: message.id
      });

      // Find the order
      const order = await Order.findOne({ orderId });
      if (!order) {
        logger.warn('Order not found for inventory insufficient event', { orderId });
        return;
      }

      // Cancel the order due to insufficient inventory
      order.cancel(`Cancelled due to insufficient inventory: ${reason}`);
      await order.save();

      logger.info('Order cancelled due to insufficient inventory', { orderId });

      // Send cancellation notification
      await orderPublisher.publishOrderNotification({
        type: 'order_cancelled',
        orderId: order.orderId,
        recipient: order.customerEmail,
        subject: `Order ${order.orderId} Cancelled`,
        content: `Your order has been cancelled due to insufficient inventory. You will be refunded if payment was processed.`,
        orderData: {
          orderId: order.orderId,
          total: order.total,
          currency: order.currency,
          reason
        }
      }, {
        correlationId: order.metadata.correlationId
      });

    } catch (error) {
      logger.error('Error handling inventory insufficient event:', error);
      throw error;
    }
  }

  /**
   * Get event handlers mapping
   */
  getEventHandlers() {
    return {
      [EVENTS.PAYMENT_SUCCEEDED]: this.handlePaymentProcessed.bind(this),
      [EVENTS.PAYMENT_FAILED]: this.handlePaymentFailed.bind(this),
      [EVENTS.INVENTORY_RESERVED]: this.handleInventoryReserved.bind(this),
      [EVENTS.INVENTORY_INSUFFICIENT]: this.handleInventoryInsufficient.bind(this)
    };
  }
}

module.exports = new OrderEventSubscriber();
