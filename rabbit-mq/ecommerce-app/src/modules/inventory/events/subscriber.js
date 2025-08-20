const EventBus = require('../../../shared/events/EventBus');
const { EVENTS } = require('../../../shared/events/events');
const inventoryService = require('../service');
const inventoryEventPublisher = require('./publisher');
const logger = require('../../../shared/utils/logger');

class InventoryEventSubscriber {
  constructor() {
    this.eventBus = EventBus;
  }

  async initialize() {
    try {
      // Subscribe to order events
      await this.eventBus.subscribe('inventory.order_events', this.handleOrderCreated.bind(this));
      await this.eventBus.subscribe('inventory.order_cancelled', this.handleOrderCancelled.bind(this));
      await this.eventBus.subscribe('inventory.payment_confirmed', this.handlePaymentConfirmed.bind(this));
      
      logger.info('Inventory event subscribers initialized', { module: 'inventory' });
    } catch (error) {
      logger.error('Error initializing inventory event subscribers:', error);
      throw error;
    }
  }

  // Handle when a new order is created - reserve stock
  async handleOrderCreated(message) {
    try {
      const orderData = JSON.parse(message.content.toString());
      logger.info('Processing order created event for inventory', { 
        orderId: orderData.id,
        module: 'inventory' 
      });

      const reservationResults = [];
      let allReservationsSuccessful = true;
      const failedReservations = [];

      // Try to reserve stock for each item in the order
      for (const item of orderData.items) {
        try {
          const result = await inventoryService.reserveStock(
            item.productId, 
            item.quantity, 
            orderData.id
          );
          
          reservationResults.push({
            productId: item.productId,
            quantity: item.quantity,
            success: true,
            available: result.available
          });

          logger.info(`Stock reserved for order item`, {
            orderId: orderData.id,
            productId: item.productId,
            quantity: item.quantity,
            module: 'inventory'
          });

        } catch (error) {
          allReservationsSuccessful = false;
          failedReservations.push({
            productId: item.productId,
            quantity: item.quantity,
            error: error.message
          });

          logger.error(`Failed to reserve stock for order item`, {
            orderId: orderData.id,
            productId: item.productId,
            quantity: item.quantity,
            error: error.message,
            module: 'inventory'
          });
        }
      }

      // If any reservation failed, release all successful ones
      if (!allReservationsSuccessful) {
        for (const successfulReservation of reservationResults) {
          try {
            await inventoryService.releaseReservation(
              successfulReservation.productId,
              successfulReservation.quantity,
              orderData.id,
              'partial_failure_rollback'
            );
          } catch (rollbackError) {
            logger.error(`Failed to rollback reservation`, {
              orderId: orderData.id,
              productId: successfulReservation.productId,
              error: rollbackError.message,
              module: 'inventory'
            });
          }
        }

        // Publish inventory reservation failed event
        await inventoryEventPublisher.publishInventoryReservationFailed({
          orderId: orderData.id,
          customerId: orderData.customerId,
          failedItems: failedReservations,
          timestamp: new Date().toISOString()
        });

        logger.warn(`Inventory reservation failed for order`, {
          orderId: orderData.id,
          failedItems: failedReservations.length,
          module: 'inventory'
        });

      } else {
        // All reservations successful
        await inventoryEventPublisher.publishInventoryReserved({
          orderId: orderData.id,
          customerId: orderData.customerId,
          reservedItems: reservationResults,
          timestamp: new Date().toISOString()
        });

        logger.info(`All inventory reserved successfully for order`, {
          orderId: orderData.id,
          itemsReserved: reservationResults.length,
          module: 'inventory'
        });
      }

    } catch (error) {
      logger.error('Error handling order created event:', error);
      
      // Publish error event
      await inventoryEventPublisher.publishInventoryError({
        orderId: orderData?.id || 'unknown',
        error: error.message,
        event: 'order_created',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle when an order is cancelled - release reserved stock
  async handleOrderCancelled(message) {
    try {
      const orderData = JSON.parse(message.content.toString());
      logger.info('Processing order cancelled event for inventory', { 
        orderId: orderData.id,
        module: 'inventory' 
      });

      const releaseResults = [];

      // Release reserved stock for each item
      for (const item of orderData.items) {
        try {
          await inventoryService.releaseReservation(
            item.productId,
            item.quantity,
            orderData.id,
            'order_cancelled'
          );

          releaseResults.push({
            productId: item.productId,
            quantity: item.quantity,
            success: true
          });

          logger.info(`Stock reservation released for cancelled order item`, {
            orderId: orderData.id,
            productId: item.productId,
            quantity: item.quantity,
            module: 'inventory'
          });

        } catch (error) {
          logger.error(`Failed to release stock reservation for cancelled order`, {
            orderId: orderData.id,
            productId: item.productId,
            error: error.message,
            module: 'inventory'
          });
        }
      }

      // Publish inventory released event
      await inventoryEventPublisher.publishInventoryReleased({
        orderId: orderData.id,
        customerId: orderData.customerId,
        releasedItems: releaseResults,
        reason: 'order_cancelled',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling order cancelled event:', error);
    }
  }

  // Handle when payment is confirmed - confirm stock usage
  async handlePaymentConfirmed(message) {
    try {
      const paymentData = JSON.parse(message.content.toString());
      logger.info('Processing payment confirmed event for inventory', { 
        orderId: paymentData.orderId,
        paymentId: paymentData.id,
        module: 'inventory' 
      });

      // For confirmed payment, we need to get the order details
      // This would typically come from the order service or be included in the event
      if (!paymentData.orderItems) {
        logger.error('Payment confirmation missing order items', {
          paymentId: paymentData.id,
          orderId: paymentData.orderId,
          module: 'inventory'
        });
        return;
      }

      const confirmationResults = [];

      // Confirm stock usage for each item (move from reserved to sold)
      for (const item of paymentData.orderItems) {
        try {
          await inventoryService.confirmStockUsage(
            item.productId,
            item.quantity,
            paymentData.orderId
          );

          confirmationResults.push({
            productId: item.productId,
            quantity: item.quantity,
            success: true
          });

          logger.info(`Stock usage confirmed for paid order item`, {
            orderId: paymentData.orderId,
            paymentId: paymentData.id,
            productId: item.productId,
            quantity: item.quantity,
            module: 'inventory'
          });

        } catch (error) {
          logger.error(`Failed to confirm stock usage for paid order`, {
            orderId: paymentData.orderId,
            paymentId: paymentData.id,
            productId: item.productId,
            error: error.message,
            module: 'inventory'
          });
        }
      }

      // Publish inventory confirmed event
      await inventoryEventPublisher.publishInventoryConfirmed({
        orderId: paymentData.orderId,
        paymentId: paymentData.id,
        customerId: paymentData.customerId,
        confirmedItems: confirmationResults,
        timestamp: new Date().toISOString()
      });

      // Check for low stock and send alerts if needed
      await this.checkAndAlertLowStock(confirmationResults);

    } catch (error) {
      logger.error('Error handling payment confirmed event:', error);
    }
  }

  // Check for low stock and send alerts
  async checkAndAlertLowStock(confirmedItems) {
    try {
      for (const item of confirmedItems) {
        if (item.success) {
          const product = await inventoryService.getProductById(item.productId);
          
          if (product.isLowStock) {
            await inventoryEventPublisher.publishLowStockAlert({
              productId: product.id,
              productName: product.name,
              currentStock: product.stock,
              availableStock: product.available,
              minStock: product.minStock,
              reserved: product.reserved,
              timestamp: new Date().toISOString()
            });

            logger.warn(`Low stock alert sent for product`, {
              productId: product.id,
              productName: product.name,
              available: product.available,
              minStock: product.minStock,
              module: 'inventory'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking for low stock:', error);
    }
  }
}

module.exports = new InventoryEventSubscriber();
