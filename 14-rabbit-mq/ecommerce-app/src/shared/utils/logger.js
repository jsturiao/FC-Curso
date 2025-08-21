const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: { 
    service: 'ecommerce-app',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let logMessage = `${timestamp} [${service}] ${level}: ${message}`;
          
          // Add metadata if present
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          
          return logMessage;
        })
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Helper functions for different log levels
const loggers = {
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  
  // Specific loggers for different contexts
  event: (eventName, data = {}) => {
    logger.info(`Event: ${eventName}`, { 
      event: eventName, 
      ...data,
      context: 'event-system'
    });
  },
  
  api: (method, path, statusCode, responseTime, meta = {}) => {
    logger.info(`API ${method} ${path}`, {
      method,
      path,
      statusCode,
      responseTime,
      context: 'api',
      ...meta
    });
  },
  
  db: (operation, collection, meta = {}) => {
    logger.info(`DB ${operation}`, {
      operation,
      collection,
      context: 'database',
      ...meta
    });
  },
  
  queue: (queueName, action, messageId, meta = {}) => {
    logger.info(`Queue ${action}`, {
      queueName,
      action,
      messageId,
      context: 'messaging',
      ...meta
    });
  }
};

module.exports = loggers;
