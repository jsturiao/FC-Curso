const EventBus = require('../../src/shared/events/EventBus');
const { EVENTS } = require('../../src/shared/events/events');
const logger = require('../../src/shared/utils/logger');

class InventoryEventPublisher {
  constructor() {
    this.eventBus = EventBus;
  }

  // Publish when inventory is successfully reserved
  async publishInventoryReserved(data) {
    try {
      const event = {
        type: EVENTS.INVENTORY_RESERVED,
        data: {
          orderId: data.orderId,
          customerId: data.customerId,
          reservedItems: data.reservedItems,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.orderId,
          eventId: `inventory_reserved_${data.orderId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.INVENTORY_RESERVED, event);
      
      logger.info('Inventory reserved event published', {
        orderId: data.orderId,
        itemsCount: data.reservedItems.length,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing inventory reserved event:', error);
      throw error;
    }
  }

  // Publish when inventory reservation fails
  async publishInventoryReservationFailed(data) {
    try {
      const event = {
        type: EVENTS.INVENTORY_RESERVATION_FAILED,
        data: {
          orderId: data.orderId,
          customerId: data.customerId,
          failedItems: data.failedItems,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.orderId,
          eventId: `inventory_reservation_failed_${data.orderId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.INVENTORY_RESERVATION_FAILED, event);
      
      logger.info('Inventory reservation failed event published', {
        orderId: data.orderId,
        failedItemsCount: data.failedItems.length,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing inventory reservation failed event:', error);
      throw error;
    }
  }

  // Publish when reserved inventory is released
  async publishInventoryReleased(data) {
    try {
      const event = {
        type: EVENTS.INVENTORY_RELEASED,
        data: {
          orderId: data.orderId,
          customerId: data.customerId,
          releasedItems: data.releasedItems,
          reason: data.reason,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.orderId,
          eventId: `inventory_released_${data.orderId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.INVENTORY_RELEASED, event);
      
      logger.info('Inventory released event published', {
        orderId: data.orderId,
        reason: data.reason,
        itemsCount: data.releasedItems.length,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing inventory released event:', error);
      throw error;
    }
  }

  // Publish when inventory usage is confirmed (stock actually reduced)
  async publishInventoryConfirmed(data) {
    try {
      const event = {
        type: EVENTS.INVENTORY_CONFIRMED,
        data: {
          orderId: data.orderId,
          paymentId: data.paymentId,
          customerId: data.customerId,
          confirmedItems: data.confirmedItems,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.orderId,
          eventId: `inventory_confirmed_${data.orderId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.INVENTORY_CONFIRMED, event);
      
      logger.info('Inventory confirmed event published', {
        orderId: data.orderId,
        paymentId: data.paymentId,
        itemsCount: data.confirmedItems.length,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing inventory confirmed event:', error);
      throw error;
    }
  }

  // Publish low stock alert
  async publishLowStockAlert(data) {
    try {
      const event = {
        type: EVENTS.LOW_STOCK_ALERT,
        data: {
          productId: data.productId,
          productName: data.productName,
          currentStock: data.currentStock,
          availableStock: data.availableStock,
          minStock: data.minStock,
          reserved: data.reserved,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service',
          urgency: data.availableStock <= 0 ? 'critical' : 'warning'
        },
        metadata: {
          version: '1.0',
          correlationId: data.productId,
          eventId: `low_stock_${data.productId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.LOW_STOCK_ALERT, event);
      
      logger.info('Low stock alert event published', {
        productId: data.productId,
        productName: data.productName,
        availableStock: data.availableStock,
        minStock: data.minStock,
        urgency: event.data.urgency,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing low stock alert event:', error);
      throw error;
    }
  }

  // Publish inventory error
  async publishInventoryError(data) {
    try {
      const event = {
        type: EVENTS.INVENTORY_ERROR,
        data: {
          orderId: data.orderId,
          error: data.error,
          event: data.event,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.orderId,
          eventId: `inventory_error_${data.orderId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.INVENTORY_ERROR, event);
      
      logger.error('Inventory error event published', {
        orderId: data.orderId,
        error: data.error,
        event: data.event,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing inventory error event:', error);
      throw error;
    }
  }

  // Publish stock updated event (for manual stock additions)
  async publishStockUpdated(data) {
    try {
      const event = {
        type: EVENTS.STOCK_UPDATED,
        data: {
          productId: data.productId,
          productName: data.productName,
          previousStock: data.previousStock,
          newStock: data.newStock,
          quantityAdded: data.quantityAdded,
          reason: data.reason,
          updatedBy: data.updatedBy || 'system',
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'inventory_service'
        },
        metadata: {
          version: '1.0',
          correlationId: data.productId,
          eventId: `stock_updated_${data.productId}_${Date.now()}`
        }
      };

      await this.eventBus.publish('ecommerce.events', EVENTS.STOCK_UPDATED, event);
      
      logger.info('Stock updated event published', {
        productId: data.productId,
        productName: data.productName,
        quantityAdded: data.quantityAdded,
        newStock: data.newStock,
        module: 'inventory'
      });
    } catch (error) {
      logger.error('Error publishing stock updated event:', error);
      throw error;
    }
  }
}

module.exports = new InventoryEventPublisher();
