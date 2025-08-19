const Order = require('./model');
const logger = require('../../shared/utils/logger');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

// Validation schemas
const createOrderSchema = Joi.object({
  customerId: Joi.string().required().min(1).max(100),
  customerEmail: Joi.string().email().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).required()
    })
  ).min(1).required(),
  shippingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default('US')
  }).optional(),
  billingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default('US')
  }).optional(),
  tax: Joi.number().min(0).default(0),
  shipping: Joi.number().min(0).default(0),
  currency: Joi.string().length(3).uppercase().default('USD'),
  metadata: Joi.object({
    source: Joi.string().default('web'),
    notes: Joi.string().max(500),
    tags: Joi.array().items(Joi.string())
  }).optional()
});

const updateOrderSchema = Joi.object({
  status: Joi.string().valid(
    'PENDING', 'INVENTORY_RESERVED', 'PAYMENT_PROCESSING', 
    'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'CONFIRMED', 
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
  ),
  shippingAddress: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  }),
  billingAddress: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  }),
  metadata: Joi.object({
    notes: Joi.string().max(500),
    tags: Joi.array().items(Joi.string())
  })
}).min(1);

class OrderController {
  /**
   * Create a new order
   */
  async createOrder(req, res) {
    try {
      // Validate request body
      const { error, value } = createOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const orderData = value;
      
      // Generate unique order ID
      orderData.orderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      // Generate correlation ID for event tracking
      const correlationId = uuidv4();
      orderData.metadata = {
        ...orderData.metadata,
        correlationId
      };

      // Calculate item totals
      orderData.items = orderData.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }));

      // Create order in database
      const order = new Order(orderData);
      await order.save();

      logger.info('Order created successfully', {
        orderId: order.orderId,
        customerId: order.customerId,
        total: order.total,
        correlationId
      });

      // Publish order created event
      const eventBus = require('../../shared/events/EventBus');
      const { EVENTS } = require('../../shared/events/events');
      
      await eventBus.publishEvent(EVENTS.ORDER_CREATED, {
        orderId: order.orderId,
        customerId: order.customerId,
        customerEmail: order.customerEmail,
        items: order.items,
        total: order.total,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt
      }, {
        source: 'orders-module',
        correlationId
      });

      res.status(201).json({
        success: true,
        order: order.summary,
        correlationId
      });

    } catch (error) {
      logger.error('Error creating order:', error);
      res.status(500).json({
        error: 'Failed to create order',
        message: error.message
      });
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          orderId
        });
      }

      res.json({
        success: true,
        order
      });

    } catch (error) {
      logger.error('Error retrieving order:', error);
      res.status(500).json({
        error: 'Failed to retrieve order',
        message: error.message
      });
    }
  }

  /**
   * Update order
   */
  async updateOrder(req, res) {
    try {
      const { orderId } = req.params;
      
      // Validate request body
      const { error, value } = updateOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          orderId
        });
      }

      // Update fields
      Object.assign(order, value);
      
      // If status is being updated, add timeline entry
      if (value.status && value.status !== order.status) {
        order.updateStatus(value.status, `Status updated via API to ${value.status}`);
      }

      await order.save();

      logger.info('Order updated successfully', {
        orderId: order.orderId,
        updatedFields: Object.keys(value)
      });

      // Publish order updated event if status changed
      if (value.status) {
        const eventBus = require('../../shared/events/EventBus');
        const { EVENTS } = require('../../shared/events/events');
        
        await eventBus.publishEvent(EVENTS.ORDER_UPDATED, {
          orderId: order.orderId,
          customerId: order.customerId,
          newStatus: order.status,
          updatedAt: order.updatedAt
        }, {
          source: 'orders-module',
          correlationId: order.metadata.correlationId
        });
      }

      res.json({
        success: true,
        order: order.summary
      });

    } catch (error) {
      logger.error('Error updating order:', error);
      res.status(500).json({
        error: 'Failed to update order',
        message: error.message
      });
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason = 'Cancelled via API' } = req.body;
      
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          orderId
        });
      }

      // Check if order can be cancelled
      const nonCancellableStatuses = ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (nonCancellableStatuses.includes(order.status)) {
        return res.status(400).json({
          error: 'Order cannot be cancelled',
          currentStatus: order.status,
          orderId
        });
      }

      order.cancel(reason);
      await order.save();

      logger.info('Order cancelled successfully', {
        orderId: order.orderId,
        reason
      });

      // Publish order cancelled event
      const eventBus = require('../../shared/events/EventBus');
      const { EVENTS } = require('../../shared/events/events');
      
      await eventBus.publishEvent(EVENTS.ORDER_CANCELLED, {
        orderId: order.orderId,
        customerId: order.customerId,
        reason,
        cancelledAt: new Date().toISOString()
      }, {
        source: 'orders-module',
        correlationId: order.metadata.correlationId
      });

      res.json({
        success: true,
        order: order.summary,
        message: 'Order cancelled successfully'
      });

    } catch (error) {
      logger.error('Error cancelling order:', error);
      res.status(500).json({
        error: 'Failed to cancel order',
        message: error.message
      });
    }
  }

  /**
   * List orders with filtering and pagination
   */
  async listOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        customerId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (customerId) query.customerId = customerId;

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Order.countDocuments(query)
      ]);

      res.json({
        success: true,
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error listing orders:', error);
      res.status(500).json({
        error: 'Failed to list orders',
        message: error.message
      });
    }
  }

  /**
   * Get orders by customer
   */
  async getCustomerOrders(req, res) {
    try {
      const { customerId } = req.params;
      const {
        page = 1,
        limit = 10,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const orders = await Order.findByCustomer(customerId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy,
        sortOrder
      });

      const total = await Order.countDocuments({ 
        customerId,
        ...(status && { status })
      });

      res.json({
        success: true,
        customerId,
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error retrieving customer orders:', error);
      res.status(500).json({
        error: 'Failed to retrieve customer orders',
        message: error.message
      });
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(req, res) {
    try {
      const { timeframe = '24h' } = req.query;
      
      const stats = await Order.getOrderStats(timeframe);
      const totalOrders = stats.reduce((sum, stat) => sum + stat.count, 0);
      const totalValue = stats.reduce((sum, stat) => sum + stat.totalValue, 0);

      res.json({
        success: true,
        timeframe,
        totalOrders,
        totalValue,
        averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
        statusBreakdown: stats
      });

    } catch (error) {
      logger.error('Error retrieving order stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve order statistics',
        message: error.message
      });
    }
  }

  /**
   * Get order timeline/history
   */
  async getOrderTimeline(req, res) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findOne({ orderId }, 'orderId timeline').lean();
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          orderId
        });
      }

      res.json({
        success: true,
        orderId: order.orderId,
        timeline: order.timeline
      });

    } catch (error) {
      logger.error('Error retrieving order timeline:', error);
      res.status(500).json({
        error: 'Failed to retrieve order timeline',
        message: error.message
      });
    }
  }

  /**
   * Test endpoint
   */
  async testEndpoint(req, res) {
    res.json({
      module: 'orders',
      status: 'working',
      timestamp: new Date().toISOString(),
      endpoints: {
        'POST /api/orders': 'Create new order',
        'GET /api/orders/:orderId': 'Get order by ID',
        'PUT /api/orders/:orderId': 'Update order',
        'DELETE /api/orders/:orderId/cancel': 'Cancel order',
        'GET /api/orders': 'List orders with filters',
        'GET /api/orders/customer/:customerId': 'Get customer orders',
        'GET /api/orders/stats': 'Get order statistics',
        'GET /api/orders/:orderId/timeline': 'Get order timeline'
      }
    });
  }
}

module.exports = new OrderController();
