const { getChannel, publishMessage, subscribeToQueue } = require('../../config/rabbitmq');
const logger = require('../utils/logger');
const messageLogger = require('./messageLogger');
const { v4: uuidv4 } = require('uuid');

class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the EventBus
   */
  async initialize() {
    try {
      await this.ensureExchangesAndQueues();
      this.isInitialized = true;
      logger.info('EventBus initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EventBus:', error);
      throw error;
    }
  }

  /**
   * Ensure all exchanges and queues exist
   */
  async ensureExchangesAndQueues() {
    const channel = await getChannel();

    // Ensure exchanges exist
    await channel.assertExchange('ecommerce.events', 'topic', { durable: true });
    await channel.assertExchange('ecommerce.notifications', 'fanout', { durable: true });
    await channel.assertExchange('ecommerce.deadletter', 'direct', { durable: true });

    // Ensure queues exist with proper bindings
    const queues = [
      {
        name: 'orders.events.queue',
        bindings: [
          { exchange: 'ecommerce.events', routingKey: 'payment.*' },
          { exchange: 'ecommerce.events', routingKey: 'inventory.*' }
        ]
      },
      {
        name: 'payments.events.queue',
        bindings: [
          { exchange: 'ecommerce.events', routingKey: 'order.created' }
        ]
      },
      {
        name: 'inventory.events.queue',
        bindings: [
          { exchange: 'ecommerce.events', routingKey: 'order.created' }
        ]
      },
      {
        name: 'notifications.email.queue',
        bindings: [
          { exchange: 'ecommerce.notifications', routingKey: '' }
        ]
      },
      {
        name: 'notifications.sms.queue',
        bindings: [
          { exchange: 'ecommerce.notifications', routingKey: '' }
        ]
      },
      {
        name: 'deadletter.queue',
        bindings: [
          { exchange: 'ecommerce.deadletter', routingKey: '#' }
        ]
      }
    ];

    for (const queueConfig of queues) {
      // Assert queue
      await channel.assertQueue(queueConfig.name, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'ecommerce.deadletter',
          'x-dead-letter-routing-key': `${queueConfig.name}.failed`
        }
      });

      // Bind queue to exchanges
      for (const binding of queueConfig.bindings) {
        await channel.bindQueue(
          queueConfig.name,
          binding.exchange,
          binding.routingKey
        );
      }
    }

    logger.info('All exchanges and queues ensured');
  }

  /**
   * Publish an event to the specified exchange
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {object} eventData - Event data
   * @param {object} options - Additional options
   */
  async publish(exchange, routingKey, eventData, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('EventBus not initialized. Call initialize() first.');
      }

      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      const message = {
        id: messageId,
        timestamp,
        routingKey,
        exchange,
        data: eventData,
        metadata: {
          source: options.source || 'unknown',
          correlationId: options.correlationId || messageId,
          causationId: options.causationId || null,
          ...options.metadata
        }
      };

      // Log message being published
      await messageLogger.logMessage('PUBLISHED', exchange, routingKey, message);

      // Publish to RabbitMQ
      const success = await publishMessage(exchange, routingKey, message, {
        messageId,
        correlationId: message.metadata.correlationId,
        timestamp: Date.now(),
        ...options
      });

      if (success) {
        logger.event('Event published', {
          messageId,
          exchange,
          routingKey,
          source: options.source
        });

        // Emit to dashboard via WebSocket
        this.emitToDashboard('message_published', {
          messageId,
          exchange,
          routingKey,
          timestamp,
          data: eventData
        });
      }

      return success;
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a queue and handle messages
   * @param {string} queueName - Queue name
   * @param {function} handler - Message handler function
   * @param {object} options - Subscription options
   */
  async subscribe(queueName, handler, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('EventBus not initialized. Call initialize() first.');
      }

      // Store subscriber info
      this.subscribers.set(queueName, {
        handler,
        options,
        subscribedAt: new Date().toISOString()
      });

      // Subscribe to queue
      await subscribeToQueue(queueName, async (message, rawMessage) => {
        try {
          // Log message being consumed
          await messageLogger.logMessage('CONSUMED', rawMessage.fields.exchange, rawMessage.fields.routingKey, message);

          logger.event('Event received', {
            messageId: message.id,
            queue: queueName,
            routingKey: rawMessage.fields.routingKey
          });

          // Emit to dashboard
          this.emitToDashboard('message_consumed', {
            messageId: message.id,
            queue: queueName,
            routingKey: rawMessage.fields.routingKey,
            timestamp: new Date().toISOString(),
            data: message.data
          });

          // Call handler
          await handler(message, rawMessage);

          logger.event('Event processed', {
            messageId: message.id,
            queue: queueName,
            status: 'success'
          });

        } catch (error) {
          logger.error(`Error processing message in ${queueName}:`, error);
          
          // Emit error to dashboard
          this.emitToDashboard('message_error', {
            messageId: message.id,
            queue: queueName,
            error: error.message,
            timestamp: new Date().toISOString()
          });

          throw error; // Re-throw to trigger DLQ
        }
      }, options);

      logger.info(`Subscribed to queue: ${queueName}`);
    } catch (error) {
      logger.error(`Error subscribing to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Publish notification event (fanout)
   * @param {object} notificationData - Notification data
   * @param {object} options - Additional options
   */
  async publishNotification(notificationData, options = {}) {
    return this.publish('ecommerce.notifications', '', notificationData, {
      ...options,
      source: options.source || 'notification-system'
    });
  }

  /**
   * Publish domain event (topic)
   * @param {string} eventType - Event type (e.g., 'order.created')
   * @param {object} eventData - Event data
   * @param {object} options - Additional options
   */
  async publishEvent(eventType, eventData, options = {}) {
    return this.publish('ecommerce.events', eventType, eventData, {
      ...options,
      source: options.source || 'domain-event'
    });
  }

  /**
   * Get subscriber information
   */
  getSubscribers() {
    return Array.from(this.subscribers.entries()).map(([queueName, info]) => ({
      queueName,
      subscribedAt: info.subscribedAt,
      options: info.options
    }));
  }

  /**
   * Get EventBus status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      subscribersCount: this.subscribers.size,
      subscribers: this.getSubscribers()
    };
  }

  /**
   * Emit event to dashboard via WebSocket
   */
  emitToDashboard(eventType, data) {
    try {
      if (global.io) {
        global.io.emit(eventType, data);
      }
    } catch (error) {
      logger.error('Error emitting to dashboard:', error);
    }
  }

  /**
   * Create exchange if it doesn't exist
   */
  async createExchange(name, type, options = {}) {
    try {
      const channel = await getChannel();
      await channel.assertExchange(name, type, {
        durable: true,
        ...options
      });
      logger.info(`Exchange created: ${name} (${type})`);
    } catch (error) {
      logger.error(`Error creating exchange ${name}:`, error);
      throw error;
    }
  }

  /**
   * Create queue if it doesn't exist
   */
  async createQueue(name, options = {}) {
    try {
      const channel = await getChannel();
      await channel.assertQueue(name, {
        durable: true,
        ...options
      });
      logger.info(`Queue created: ${name}`);
    } catch (error) {
      logger.error(`Error creating queue ${name}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
