const eventBus = require('./EventBus');
const logger = require('../utils/logger');

class DeadLetterQueueManager {
  constructor() {
    this.dlqMessages = new Map(); // Cache em memória para demonstração
    this.subscribers = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializar o gerenciador de DLQ
   */
  async initialize() {
    try {
      logger.info('Initializing Dead Letter Queue Manager...');

      // Inscrever-se em todas as filas DLQ
      const dlqQueues = [
        'dlq.orders.created.failed',
        'dlq.payments.process.failed',
        'dlq.inventory.reserve.failed',
        'dlq.notifications.send.failed'
      ];

      for (const queueName of dlqQueues) {
        await this.subscribeToDLQ(queueName);
      }

      this.isInitialized = true;
      logger.info('✅ Dead Letter Queue Manager initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize DLQ Manager:', error);
      throw error;
    }
  }

  /**
   * Inscrever-se em uma fila DLQ específica
   */
  async subscribeToDLQ(queueName) {
    try {
      const handler = (message) => this.handleDLQMessage(queueName, message);
      
      await eventBus.subscribe(queueName, handler, {
        queueName,
        prefetch: 10
      });

      this.subscribers.set(queueName, handler);
      
      logger.info(`Subscribed to DLQ: ${queueName}`);

    } catch (error) {
      logger.error(`Failed to subscribe to DLQ: ${queueName}`, error);
      throw error;
    }
  }

  /**
   * Processar mensagem da DLQ
   */
  async handleDLQMessage(queueName, message) {
    try {
      const dlqMessage = {
        id: this.generateDLQId(),
        queueName,
        originalMessage: message.originalMessage,
        error: message.error,
        metadata: message.metadata,
        dlqInfo: message.dlqInfo,
        receivedAt: new Date().toISOString(),
        status: 'failed',
        reprocessAttempts: 0
      };

      // Armazenar na cache (em produção, usar banco de dados)
      this.dlqMessages.set(dlqMessage.id, dlqMessage);

      logger.info('DLQ message processed and stored', {
        dlqId: dlqMessage.id,
        originalQueue: dlqMessage.metadata?.originalQueue,
        correlationId: dlqMessage.metadata?.correlationId
      });

      // Notificar sobre nova mensagem na DLQ
      await this.notifyDLQMessage(dlqMessage);

    } catch (error) {
      logger.error('Failed to handle DLQ message', {
        queueName,
        error: error.message
      });
    }
  }

  /**
   * Notificar sobre nova mensagem na DLQ (para dashboard)
   */
  async notifyDLQMessage(dlqMessage) {
    try {
      // Publicar evento para dashboard
      await eventBus.publishEvent('ecommerce.events', 'dlq.message.received', {
        dlqId: dlqMessage.id,
        originalQueue: dlqMessage.metadata?.originalQueue,
        errorType: dlqMessage.error?.name,
        errorMessage: dlqMessage.error?.message,
        correlationId: dlqMessage.metadata?.correlationId,
        timestamp: dlqMessage.receivedAt
      });

    } catch (error) {
      logger.error('Failed to notify DLQ message', error);
    }
  }

  /**
   * Listar mensagens na DLQ
   */
  getDLQMessages(options = {}) {
    const { 
      status = null, 
      queueName = null, 
      limit = 50, 
      offset = 0 
    } = options;

    let messages = Array.from(this.dlqMessages.values());

    // Filtrar por status
    if (status) {
      messages = messages.filter(msg => msg.status === status);
    }

    // Filtrar por queue
    if (queueName) {
      messages = messages.filter(msg => 
        msg.metadata?.originalQueue === queueName || msg.queueName === queueName
      );
    }

    // Ordenar por data (mais recente primeiro)
    messages.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    // Paginar
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      total: messages.length,
      offset,
      limit,
      hasMore: (offset + limit) < messages.length
    };
  }

  /**
   * Obter mensagem específica da DLQ
   */
  getDLQMessage(dlqId) {
    return this.dlqMessages.get(dlqId) || null;
  }

  /**
   * Reprocessar mensagem da DLQ
   */
  async reprocessDLQMessage(dlqId, options = {}) {
    try {
      const dlqMessage = this.dlqMessages.get(dlqId);
      if (!dlqMessage) {
        throw new Error(`DLQ message not found: ${dlqId}`);
      }

      // Marcar como sendo reprocessada
      dlqMessage.status = 'reprocessing';
      dlqMessage.reprocessAttempts += 1;
      dlqMessage.lastReprocessAt = new Date().toISOString();

      logger.info('Reprocessing DLQ message', {
        dlqId,
        originalQueue: dlqMessage.metadata?.originalQueue,
        reprocessAttempt: dlqMessage.reprocessAttempts
      });

      // Determinar fila de destino original
      const originalQueue = dlqMessage.metadata?.originalQueue;
      const routingKey = this.getOriginalRoutingKey(originalQueue);

      // Republicar mensagem na fila original
      await eventBus.publishEvent('ecommerce.events', routingKey, dlqMessage.originalMessage, {
        persistent: true,
        headers: {
          'x-reprocessed-from-dlq': 'true',
          'x-original-dlq-id': dlqId,
          'x-reprocess-attempt': dlqMessage.reprocessAttempts.toString()
        }
      });

      dlqMessage.status = 'reprocessed';

      logger.info('DLQ message reprocessed successfully', {
        dlqId,
        originalQueue,
        routingKey
      });

      return { success: true, dlqMessage };

    } catch (error) {
      const dlqMessage = this.dlqMessages.get(dlqId);
      if (dlqMessage) {
        dlqMessage.status = 'reprocess_failed';
        dlqMessage.lastError = error.message;
      }

      logger.error('Failed to reprocess DLQ message', {
        dlqId,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Determinar routing key original baseado na fila
   */
  getOriginalRoutingKey(originalQueue) {
    const routingKeyMap = {
      'orders.created': 'order.created',
      'payments.process': 'order.created',
      'inventory.reserve': 'order.created',
      'notifications.send': 'notification.send'
    };

    return routingKeyMap[originalQueue] || 'unknown.event';
  }

  /**
   * Remover mensagem da DLQ
   */
  async removeDLQMessage(dlqId) {
    try {
      const dlqMessage = this.dlqMessages.get(dlqId);
      if (!dlqMessage) {
        throw new Error(`DLQ message not found: ${dlqId}`);
      }

      this.dlqMessages.delete(dlqId);

      logger.info('DLQ message removed', {
        dlqId,
        originalQueue: dlqMessage.metadata?.originalQueue
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to remove DLQ message', {
        dlqId,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Obter estatísticas da DLQ
   */
  getDLQStats() {
    const messages = Array.from(this.dlqMessages.values());
    
    const stats = {
      total: messages.length,
      byStatus: {},
      byQueue: {},
      byErrorType: {},
      recentErrors: []
    };

    // Estatísticas por status
    messages.forEach(msg => {
      stats.byStatus[msg.status] = (stats.byStatus[msg.status] || 0) + 1;
    });

    // Estatísticas por fila original
    messages.forEach(msg => {
      const queue = msg.metadata?.originalQueue || 'unknown';
      stats.byQueue[queue] = (stats.byQueue[queue] || 0) + 1;
    });

    // Estatísticas por tipo de erro
    messages.forEach(msg => {
      const errorType = msg.error?.name || 'unknown';
      stats.byErrorType[errorType] = (stats.byErrorType[errorType] || 0) + 1;
    });

    // Erros recentes (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.recentErrors = messages
      .filter(msg => new Date(msg.receivedAt) > oneDayAgo)
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
      .slice(0, 10)
      .map(msg => ({
        dlqId: msg.id,
        originalQueue: msg.metadata?.originalQueue,
        errorMessage: msg.error?.message,
        receivedAt: msg.receivedAt
      }));

    return stats;
  }

  /**
   * Gerar ID único para mensagem DLQ
   */
  generateDLQId() {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verificar se o gerenciador está inicializado
   */
  isReady() {
    return this.isInitialized;
  }
}

// Singleton instance
const dlqManager = new DeadLetterQueueManager();

module.exports = dlqManager;
