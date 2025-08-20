const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

// Schema for storing message logs
const messageLogSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['PUBLISHED', 'CONSUMED', 'FAILED', 'RETRIED']
  },
  exchange: {
    type: String,
    required: true
  },
  routingKey: {
    type: String,
    required: true
  },
  queue: {
    type: String,
    required: false // Only for consumed messages
  },
  message: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    source: String,
    correlationId: String,
    causationId: String,
    retryCount: { type: Number, default: 0 },
    errorMessage: String
  }
}, {
  timestamps: true,
  collection: 'message_logs'
});

// Create indexes for better performance
messageLogSchema.index({ messageId: 1, action: 1 });
messageLogSchema.index({ timestamp: -1 });
messageLogSchema.index({ exchange: 1, routingKey: 1 });
messageLogSchema.index({ 'metadata.correlationId': 1 });

const MessageLog = mongoose.model('MessageLog', messageLogSchema);

class MessageLogger extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      totalMessages: 0,
      errorCount: 0
    };
  }

  /**
   * Log a message action (published, consumed, failed, etc.)
   */
  async logMessage(action, exchange, routingKey, message, metadata = {}) {
    try {
      const logEntry = new MessageLog({
        messageId: message.id || message.messageId || 'unknown',
        action,
        exchange,
        routingKey,
        queue: metadata.queue || null,
        message: this.sanitizeMessage(message),
        metadata: {
          source: metadata.source || 'unknown',
          correlationId: message.metadata?.correlationId || metadata.correlationId,
          causationId: message.metadata?.causationId || metadata.causationId,
          retryCount: metadata.retryCount || 0,
          errorMessage: metadata.errorMessage || null
        }
      });

      await logEntry.save();
      this.stats.totalMessages++;

      // Emit for real-time dashboard
      this.emit('message-logged', {
        id: logEntry.messageId,
        timestamp: logEntry.timestamp,
        eventType: `${exchange}.${action.toLowerCase()}`,
        exchange,
        routingKey,
        correlationId: logEntry.metadata.correlationId,
        data: message,
        metadata: logEntry.metadata
      });

      logger.info(`Message logged: ${action}`, {
        messageId: logEntry.messageId,
        exchange,
        routingKey
      });

    } catch (error) {
      this.stats.errorCount++;
      logger.error('Error logging message:', error);
      // Don't throw error to avoid breaking message processing
    }
  }

  /**
   * Get message logs with filtering and pagination
   */
  async getMessageLogs(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const query = {};

      // Apply filters
      if (filters.messageId) {
        query.messageId = filters.messageId;
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.exchange) {
        query.exchange = filters.exchange;
      }

      if (filters.routingKey) {
        query.routingKey = new RegExp(filters.routingKey, 'i');
      }

      if (filters.correlationId) {
        query['metadata.correlationId'] = filters.correlationId;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.timestamp = {};
        if (filters.dateFrom) {
          query.timestamp.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.timestamp.$lte = new Date(filters.dateTo);
        }
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        MessageLog.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        MessageLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error retrieving message logs:', error);
      throw error;
    }
  }

  /**
   * Get message flow for a specific correlation ID
   */
  async getMessageFlow(correlationId) {
    try {
      const logs = await MessageLog.find({
        'metadata.correlationId': correlationId
      }).sort({ timestamp: 1 }).lean();

      return logs.map(log => ({
        messageId: log.messageId,
        action: log.action,
        exchange: log.exchange,
        routingKey: log.routingKey,
        queue: log.queue,
        timestamp: log.timestamp,
        metadata: log.metadata
      }));

    } catch (error) {
      logger.error('Error retrieving message flow:', error);
      throw error;
    }
  }

  /**
   * Get statistics about message processing
   */
  async getMessageStats(timeframe = '24h') {
    try {
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const [actionStats, exchangeStats, errorStats] = await Promise.all([
        // Messages by action
        MessageLog.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Messages by exchange
        MessageLog.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$exchange', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Failed messages
        MessageLog.aggregate([
          {
            $match: {
              timestamp: { $gte: startDate },
              action: 'FAILED'
            }
          },
          { $group: { _id: '$routingKey', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      return {
        timeframe,
        period: { start: startDate, end: now },
        byAction: actionStats,
        byExchange: exchangeStats,
        errors: errorStats,
        totalMessages: actionStats.reduce((sum, stat) => sum + stat.count, 0)
      };

    } catch (error) {
      logger.error('Error retrieving message stats:', error);
      throw error;
    }
  }

  /**
   * Get recent message activity for dashboard
   */
  async getRecentActivity(limit = 20) {
    try {
      const recentLogs = await MessageLog.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return recentLogs.map(log => ({
        messageId: log.messageId,
        action: log.action,
        exchange: log.exchange,
        routingKey: log.routingKey,
        timestamp: log.timestamp,
        correlationId: log.metadata?.correlationId
      }));

    } catch (error) {
      logger.error('Error retrieving recent activity:', error);
      throw error;
    }
  }

  /**
   * Clean old logs (retention policy)
   */
  async cleanOldLogs(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await MessageLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Cleaned ${result.deletedCount} old message logs`);
      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning old logs:', error);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Sanitize message for storage (remove sensitive data)
   */
  sanitizeMessage(message) {
    const sanitized = { ...message };

    // Remove sensitive fields if they exist
    const sensitiveFields = ['password', 'creditCard', 'ssn', 'token'];
    const visited = new WeakSet(); // Track visited objects to prevent infinite recursion

    function removeSensitiveFields(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;

      // Prevent infinite recursion with circular references
      if (visited.has(obj)) return obj;
      visited.add(obj);

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeSensitiveFields(obj[key]);
          }
        }
      }

      return obj;
    }

    removeSensitiveFields(sanitized);
    return sanitized;
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
}

// Export singleton instance
const messageLogger = new MessageLogger();

module.exports = messageLogger;
