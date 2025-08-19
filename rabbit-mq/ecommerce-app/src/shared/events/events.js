// Event definitions for the e-commerce system
// These constants ensure consistency across all modules

const EVENTS = {
  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_CONFIRMED: 'order.confirmed',
  
  // Payment Events
  PAYMENT_REQUESTED: 'payment.requested',
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Inventory Events
  INVENTORY_CHECKED: 'inventory.checked',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  INVENTORY_INSUFFICIENT: 'inventory.insufficient',
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_RESERVATION_FAILED: 'inventory.reservation.failed',
  INVENTORY_CONFIRMED: 'inventory.confirmed',
  INVENTORY_ERROR: 'inventory.error',
  LOW_STOCK_ALERT: 'inventory.low.stock.alert',
  STOCK_UPDATED: 'inventory.stock.updated',
  
  // Notification Events
  NOTIFICATION_EMAIL_SENT: 'notification.email.sent',
  NOTIFICATION_SMS_SENT: 'notification.sms.sent',
  NOTIFICATION_PUSH_SENT: 'notification.push.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // Extended Events for Notifications
  ORDER_STATUS_UPDATED: 'order.status.updated',
  INVENTORY_BACK_IN_STOCK: 'inventory.back.in.stock',
  PROMOTIONAL_CAMPAIGN: 'promotional.campaign'
};

// Event schemas for validation and documentation
const EVENT_SCHEMAS = {
  [EVENTS.ORDER_CREATED]: {
    description: 'Fired when a new order is created',
    data: {
      orderId: 'string (required) - Unique order identifier',
      customerId: 'string (required) - Customer identifier',
      items: 'array (required) - Array of order items',
      total: 'number (required) - Total order amount',
      currency: 'string (required) - Currency code (e.g., USD)',
      customerEmail: 'string (required) - Customer email for notifications',
      shippingAddress: 'object (optional) - Shipping address details'
    },
    example: {
      orderId: 'order_123',
      customerId: 'customer_456',
      items: [
        { productId: 'prod_1', quantity: 2, price: 25.00 },
        { productId: 'prod_2', quantity: 1, price: 15.00 }
      ],
      total: 65.00,
      currency: 'USD',
      customerEmail: 'customer@example.com'
    }
  },

  [EVENTS.PAYMENT_SUCCEEDED]: {
    description: 'Fired when payment is successfully processed',
    data: {
      paymentId: 'string (required) - Unique payment identifier',
      orderId: 'string (required) - Related order identifier',
      amount: 'number (required) - Payment amount',
      currency: 'string (required) - Currency code',
      paymentMethod: 'string (required) - Payment method used',
      transactionId: 'string (optional) - External transaction ID'
    },
    example: {
      paymentId: 'payment_789',
      orderId: 'order_123',
      amount: 65.00,
      currency: 'USD',
      paymentMethod: 'credit_card',
      transactionId: 'txn_abc123'
    }
  },

  [EVENTS.INVENTORY_RESERVED]: {
    description: 'Fired when inventory is successfully reserved',
    data: {
      orderId: 'string (required) - Related order identifier',
      reservationId: 'string (required) - Unique reservation identifier',
      items: 'array (required) - Array of reserved items',
      reservedAt: 'string (required) - ISO timestamp of reservation'
    },
    example: {
      orderId: 'order_123',
      reservationId: 'res_456',
      items: [
        { productId: 'prod_1', quantity: 2, reserved: 2 },
        { productId: 'prod_2', quantity: 1, reserved: 1 }
      ],
      reservedAt: '2025-08-14T10:30:00Z'
    }
  }
};

// Notification types
const NOTIFICATION_TYPES = {
  EMAIL: {
    ORDER_CONFIRMATION: 'order_confirmation',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    ORDER_SHIPPED: 'order_shipped',
    ORDER_CANCELLED: 'order_cancelled'
  },
  SMS: {
    ORDER_CONFIRMED: 'order_confirmed',
    PAYMENT_ALERT: 'payment_alert',
    DELIVERY_NOTIFICATION: 'delivery_notification'
  }
};

// Exchange and queue mappings
const EXCHANGE_CONFIG = {
  EVENTS: {
    name: 'ecommerce.events',
    type: 'topic',
    description: 'Main exchange for domain events'
  },
  NOTIFICATIONS: {
    name: 'ecommerce.notifications',
    type: 'fanout',
    description: 'Exchange for broadcasting notifications'
  },
  DEADLETTER: {
    name: 'ecommerce.deadletter',
    type: 'direct',
    description: 'Exchange for failed messages'
  }
};

const QUEUE_CONFIG = {
  ORDERS: {
    name: 'orders.events.queue',
    subscribesTo: ['payment.*', 'inventory.*'],
    description: 'Queue for order-related events'
  },
  PAYMENTS: {
    name: 'payments.events.queue',
    subscribesTo: ['order.created'],
    description: 'Queue for payment processing'
  },
  INVENTORY: {
    name: 'inventory.events.queue',
    subscribesTo: ['order.created'],
    description: 'Queue for inventory management'
  },
  NOTIFICATIONS_EMAIL: {
    name: 'notifications.email.queue',
    subscribesTo: ['*'],
    description: 'Queue for email notifications'
  },
  NOTIFICATIONS_SMS: {
    name: 'notifications.sms.queue',
    subscribesTo: ['*'],
    description: 'Queue for SMS notifications'
  }
};

// Helper functions
function getEventSchema(eventType) {
  return EVENT_SCHEMAS[eventType] || null;
}

function validateEventData(eventType, data) {
  const schema = getEventSchema(eventType);
  if (!schema) {
    throw new Error(`Unknown event type: ${eventType}`);
  }
  
  // Basic validation (in a real app, you might use Joi or similar)
  const requiredFields = Object.entries(schema.data)
    .filter(([_, definition]) => definition.includes('required'))
    .map(([field, _]) => field);
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field} for event ${eventType}`);
    }
  }
  
  return true;
}

function createEvent(eventType, data, metadata = {}) {
  // Validate event data
  validateEventData(eventType, data);
  
  return {
    type: eventType,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata
    }
  };
}

// Event utilities
const EventUtils = {
  // Check if event is order-related
  isOrderEvent: (eventType) => eventType.startsWith('order.'),
  
  // Check if event is payment-related
  isPaymentEvent: (eventType) => eventType.startsWith('payment.'),
  
  // Check if event is inventory-related
  isInventoryEvent: (eventType) => eventType.startsWith('inventory.'),
  
  // Check if event is notification-related
  isNotificationEvent: (eventType) => eventType.startsWith('notification.'),
  
  // Get module that should handle this event
  getEventModule: (eventType) => {
    if (EventUtils.isOrderEvent(eventType)) return 'orders';
    if (EventUtils.isPaymentEvent(eventType)) return 'payments';
    if (EventUtils.isInventoryEvent(eventType)) return 'inventory';
    if (EventUtils.isNotificationEvent(eventType)) return 'notifications';
    return 'unknown';
  },
  
  // Get routing key patterns for a module
  getModuleRoutingKeys: (module) => {
    switch (module) {
      case 'orders': return ['payment.*', 'inventory.*'];
      case 'payments': return ['order.created'];
      case 'inventory': return ['order.created'];
      case 'notifications': return ['*'];
      default: return [];
    }
  }
};

module.exports = {
  EVENTS,
  EVENT_SCHEMAS,
  NOTIFICATION_TYPES,
  EXCHANGE_CONFIG,
  QUEUE_CONFIG,
  getEventSchema,
  validateEventData,
  createEvent,
  EventUtils
};
