// Test routes for EventBus functionality
const express = require('express');
const router = express.Router();
const eventBus = require('../../shared/events/EventBus');
const { EVENTS, createEvent } = require('../../shared/events/events');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../shared/utils/logger');

/**
 * Test EventBus publish functionality
 */
router.post('/publish', async (req, res) => {
  try {
    const { eventType, data, exchange, routingKey } = req.body;

    if (!eventType && (!exchange || !routingKey)) {
      return res.status(400).json({
        error: 'Either eventType or (exchange + routingKey) must be provided'
      });
    }

    let result;
    const correlationId = uuidv4();

    if (eventType) {
      // Use predefined event type
      result = await eventBus.publishEvent(eventType, data, {
        source: 'test-api',
        correlationId
      });
    } else {
      // Use custom exchange and routing key
      result = await eventBus.publish(exchange, routingKey, data, {
        source: 'test-api',
        correlationId
      });
    }

    res.json({
      success: result,
      correlationId,
      eventType: eventType || `${exchange}:${routingKey}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in test publish:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test notification publishing
 */
router.post('/publish-notification', async (req, res) => {
  try {
    const { type, recipient, subject, content } = req.body;

    if (!type || !recipient) {
      return res.status(400).json({
        error: 'type and recipient are required'
      });
    }

    const notificationData = {
      type,
      recipient,
      subject: subject || 'Test Notification',
      content: content || 'This is a test notification from the EventBus API',
      timestamp: new Date().toISOString()
    };

    const correlationId = uuidv4();
    const result = await eventBus.publishNotification(notificationData, {
      source: 'test-api',
      correlationId
    });

    res.json({
      success: result,
      correlationId,
      notificationData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in test notification publish:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a test order event
 */
router.post('/create-order', async (req, res) => {
  try {
    const {
      customerId = 'test_customer_123',
      items = [
        { productId: 'product_1', quantity: 2, price: 25.00 },
        { productId: 'product_2', quantity: 1, price: 15.00 }
      ],
      customerEmail = 'test@example.com'
    } = req.body;

    const orderId = `order_${uuidv4()}`;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
      orderId,
      customerId,
      items,
      total,
      currency: 'USD',
      customerEmail,
      createdAt: new Date().toISOString()
    };

    const correlationId = uuidv4();
    const result = await eventBus.publishEvent(EVENTS.ORDER_CREATED, orderData, {
      source: 'test-api',
      correlationId
    });

    res.json({
      success: result,
      orderData,
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating test order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Simulate payment success
 */
router.post('/payment-success', async (req, res) => {
  try {
    const {
      orderId = `order_${uuidv4()}`,
      amount = 65.00,
      paymentMethod = 'credit_card'
    } = req.body;

    const paymentData = {
      paymentId: `payment_${uuidv4()}`,
      orderId,
      amount,
      currency: 'USD',
      paymentMethod,
      transactionId: `txn_${uuidv4()}`,
      processedAt: new Date().toISOString()
    };

    const correlationId = uuidv4();
    const result = await eventBus.publishEvent(EVENTS.PAYMENT_SUCCEEDED, paymentData, {
      source: 'test-api',
      correlationId
    });

    res.json({
      success: result,
      paymentData,
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error simulating payment success:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test complete order flow
 */
router.post('/complete-flow', async (req, res) => {
  try {
    const correlationId = uuidv4();
    const orderId = `order_${uuidv4()}`;
    const customerId = 'test_customer_flow';

    const events = [];

    // 1. Create Order
    const orderData = {
      orderId,
      customerId,
      items: [
        { productId: 'product_1', quantity: 1, price: 29.99 }
      ],
      total: 29.99,
      currency: 'USD',
      customerEmail: 'flow@example.com'
    };

    await eventBus.publishEvent(EVENTS.ORDER_CREATED, orderData, {
      source: 'test-flow',
      correlationId
    });
    events.push({ event: EVENTS.ORDER_CREATED, data: orderData });

    // 2. Reserve Inventory (simulate delay)
    setTimeout(async () => {
      const inventoryData = {
        orderId,
        reservationId: `res_${uuidv4()}`,
        items: [
          { productId: 'product_1', quantity: 1, reserved: 1 }
        ],
        reservedAt: new Date().toISOString()
      };

      await eventBus.publishEvent(EVENTS.INVENTORY_RESERVED, inventoryData, {
        source: 'test-flow',
        correlationId,
        causationId: correlationId
      });
    }, 1000);

    // 3. Process Payment (simulate delay)
    setTimeout(async () => {
      const paymentData = {
        paymentId: `payment_${uuidv4()}`,
        orderId,
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        transactionId: `txn_${uuidv4()}`
      };

      await eventBus.publishEvent(EVENTS.PAYMENT_SUCCEEDED, paymentData, {
        source: 'test-flow',
        correlationId,
        causationId: correlationId
      });
    }, 2000);

    res.json({
      message: 'Complete order flow initiated',
      correlationId,
      orderId,
      events: events.map(e => e.event),
      note: 'Check the dashboard for real-time event processing'
    });

  } catch (error) {
    logger.error('Error in complete flow test:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available event types for testing
 */
router.get('/event-types', (req, res) => {
  res.json({
    events: EVENTS,
    examples: {
      [EVENTS.ORDER_CREATED]: {
        orderId: 'order_123',
        customerId: 'customer_456',
        items: [{ productId: 'prod_1', quantity: 2, price: 25.00 }],
        total: 50.00,
        currency: 'USD',
        customerEmail: 'test@example.com'
      },
      [EVENTS.PAYMENT_SUCCEEDED]: {
        paymentId: 'payment_789',
        orderId: 'order_123',
        amount: 50.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      },
      [EVENTS.INVENTORY_RESERVED]: {
        orderId: 'order_123',
        reservationId: 'res_456',
        items: [{ productId: 'prod_1', quantity: 2, reserved: 2 }]
      }
    }
  });
});

/**
 * Health check for EventBus
 */
router.get('/health', (req, res) => {
  const status = eventBus.getStatus();
  res.json({
    ...status,
    healthy: status.initialized,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
