const eventBus = require('../../../shared/events/EventBus');
const { EVENTS } = require('../../../shared/events/events');
const logger = require('../../../shared/utils/logger');

class OrderEventPublisher {
  /**
   * Publish order created event
   */
  async publishOrderCreated(orderData, options = {}) {
    try {
      await eventBus.publishEvent(EVENTS.ORDER_CREATED, orderData, {
        source: 'orders-module',
        ...options
      });

      logger.event('Order created event published', {
        orderId: orderData.orderId,
        correlationId: options.correlationId
      });

    } catch (error) {
      logger.error('Error publishing order created event:', error);
      throw error;
    }
  }

  /**
   * Publish order updated event
   */
  async publishOrderUpdated(orderData, options = {}) {
    try {
      await eventBus.publishEvent(EVENTS.ORDER_UPDATED, orderData, {
        source: 'orders-module',
        ...options
      });

      logger.event('Order updated event published', {
        orderId: orderData.orderId,
        newStatus: orderData.newStatus,
        correlationId: options.correlationId
      });

    } catch (error) {
      logger.error('Error publishing order updated event:', error);
      throw error;
    }
  }

  /**
   * Publish order cancelled event
   */
  async publishOrderCancelled(orderData, options = {}) {
    try {
      await eventBus.publishEvent(EVENTS.ORDER_CANCELLED, orderData, {
        source: 'orders-module',
        ...options
      });

      logger.event('Order cancelled event published', {
        orderId: orderData.orderId,
        reason: orderData.reason,
        correlationId: options.correlationId
      });

    } catch (error) {
      logger.error('Error publishing order cancelled event:', error);
      throw error;
    }
  }

  /**
   * Publish order confirmed event
   */
  async publishOrderConfirmed(orderData, options = {}) {
    try {
      await eventBus.publishEvent(EVENTS.ORDER_CONFIRMED, orderData, {
        source: 'orders-module',
        ...options
      });

      logger.event('Order confirmed event published', {
        orderId: orderData.orderId,
        correlationId: options.correlationId
      });

    } catch (error) {
      logger.error('Error publishing order confirmed event:', error);
      throw error;
    }
  }

  /**
   * Publish notification event for order
   */
  async publishOrderNotification(notificationData, options = {}) {
    try {
      await eventBus.publishNotification(notificationData, {
        source: 'orders-module',
        ...options
      });

      logger.event('Order notification published', {
        orderId: notificationData.orderId,
        type: notificationData.type,
        recipient: notificationData.recipient,
        correlationId: options.correlationId
      });

    } catch (error) {
      logger.error('Error publishing order notification:', error);
      throw error;
    }
  }
}

module.exports = new OrderEventPublisher();
