const amqp = require('amqplib');
const logger = require('../shared/utils/logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ecommerce';

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  try {
    // Create connection
    connection = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60,
      clientProperties: {
        connection_name: 'ecommerce-app'
      }
    });
    
    logger.info('RabbitMQ connected successfully');
    
    // Create channel
    channel = await connection.createChannel();
    
    // Set prefetch count for fair dispatching
    await channel.prefetch(1);
    
    logger.info('RabbitMQ channel created');
    
    // Handle connection events
    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error);
    });
    
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });
    
    // Ensure exchanges exist
    await ensureExchanges();
    
    return { connection, channel };
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
}

async function ensureExchanges() {
  try {
    // Events exchange (Topic)
    await channel.assertExchange('ecommerce.events', 'topic', {
      durable: true
    });
    
    // Notifications exchange (Fanout)
    await channel.assertExchange('ecommerce.notifications', 'fanout', {
      durable: true
    });
    
    // Dead letter exchange (Direct)
    await channel.assertExchange('ecommerce.deadletter', 'direct', {
      durable: true
    });
    
    logger.info('All exchanges ensured');
  } catch (error) {
    logger.error('Error ensuring exchanges:', error);
    throw error;
  }
}

async function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ not connected. Call connectRabbitMQ() first.');
  }
  return channel;
}

async function getConnection() {
  if (!connection) {
    throw new Error('RabbitMQ not connected. Call connectRabbitMQ() first.');
  }
  return connection;
}

async function closeConnection() {
  try {
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ channel closed');
    }
    
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
    throw error;
  }
}

// Utility function to publish messages
async function publishMessage(exchange, routingKey, message, options = {}) {
  try {
    const ch = await getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const success = ch.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
      timestamp: Date.now(),
      messageId: require('uuid').v4(),
      ...options
    });
    
    if (success) {
      logger.info(`Message published to ${exchange}:${routingKey}`, { messageId: options.messageId });
    } else {
      logger.warn(`Failed to publish message to ${exchange}:${routingKey}`);
    }
    
    return success;
  } catch (error) {
    logger.error('Error publishing message:', error);
    throw error;
  }
}

// Utility function to subscribe to messages
async function subscribeToQueue(queueName, handler, options = {}) {
  try {
    const ch = await getChannel();
    
    // Assert queue exists
    await ch.assertQueue(queueName, {
      durable: true,
      ...options
    });
    
    // Set up consumer
    await ch.consume(queueName, async (message) => {
      if (message) {
        try {
          const content = JSON.parse(message.content.toString());
          
          logger.info(`Message received from ${queueName}`, {
            messageId: message.properties.messageId,
            routingKey: message.fields.routingKey
          });
          
          // Call handler
          await handler(content, message);
          
          // Acknowledge message
          ch.ack(message);
          
          logger.info(`Message processed successfully from ${queueName}`);
        } catch (error) {
          logger.error(`Error processing message from ${queueName}:`, error);
          
          // Reject and requeue (could implement retry logic here)
          ch.nack(message, false, false);
        }
      }
    });
    
    logger.info(`Subscribed to queue: ${queueName}`);
  } catch (error) {
    logger.error(`Error subscribing to queue ${queueName}:`, error);
    throw error;
  }
}

module.exports = {
  connectRabbitMQ,
  getChannel,
  getConnection,
  closeConnection,
  publishMessage,
  subscribeToQueue
};
