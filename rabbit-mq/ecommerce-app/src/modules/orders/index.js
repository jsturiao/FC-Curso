const EventBus = require('../../shared/events/EventBus');
const orderSubscriber = require('./events/subscriber');
const logger = require('../../shared/utils/logger');
const Order = require('./model');
const orderRoutes = require('./routes');

class OrderModule {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the orders module
   */
  async initialize() {
    try {
      logger.info('Initializing Orders Module...');

      // Subscribe to events
      await this.subscribeToEvents();

      this.isInitialized = true;
      logger.info('Orders Module initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Orders Module:', error);
      throw error;
    }
  }

  /**
   * Subscribe to relevant events
   */
  async subscribeToEvents() {
    try {
      const eventHandlers = orderSubscriber.getEventHandlers();

      for (const [eventType, handler] of Object.entries(eventHandlers)) {
        await EventBus.subscribe(eventType, handler, {
          queueName: `orders.${eventType.toLowerCase().replace(/_/g, '.')}`
        });
        
        logger.info(`Orders module subscribed to event: ${eventType}`);
      }

    } catch (error) {
      logger.error('Error subscribing to events:', error);
      throw error;
    }
  }

  /**
   * Health check for the orders module
   */
  async healthCheck() {
    try {
      // Check database connection
      const orderCount = await Order.countDocuments();
      
      // Check EventBus status
      const eventBusStatus = EventBus.isConnected();

      return {
        status: 'healthy',
        initialized: this.isInitialized,
        database: {
          connected: true,
          orderCount
        },
        eventBus: {
          connected: eventBusStatus
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Orders module health check failed:', error);
      
      return {
        status: 'unhealthy',
        initialized: this.isInitialized,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get module statistics
   */
  async getStats() {
    try {
      const stats = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$total' }
          }
        }
      ]);

      const totalOrders = await Order.countDocuments();
      const recentOrders = await Order.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      return {
        totalOrders,
        recentOrders,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalValue: stat.totalValue
          };
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting orders module stats:', error);
      throw error;
    }
  }

  /**
   * Get routes
   */
  get routes() {
    return orderRoutes;
  }

  /**
   * Gracefully shutdown the orders module
   */
  async shutdown() {
    try {
      logger.info('Shutting down Orders Module...');
      
      // Any cleanup logic can go here
      this.isInitialized = false;
      
      logger.info('Orders Module shutdown complete');
    } catch (error) {
      logger.error('Error during Orders Module shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new OrderModule();
