const logger = require('../utils/logger');
const eventBus = require('./EventBus');

class RetryHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 segundo
    this.retryQueues = new Map();
  }

  /**
   * Processar mensagem com retry automático
   */
  async processWithRetry(handler, message, options = {}) {
    const { 
      maxRetries = this.maxRetries,
      baseDelay = this.baseDelay,
      queueName = 'unknown',
      correlationId = message.correlationId || 'unknown'
    } = options;

    const retryKey = `${queueName}:${correlationId}`;
    const currentRetry = this.retryQueues.get(retryKey) || 0;

    try {
      // Tentar processar a mensagem
      await handler(message);
      
      // Se sucesso, remover da lista de retry
      this.retryQueues.delete(retryKey);
      
      logger.info('Message processed successfully', {
        queueName,
        correlationId,
        retryAttempt: currentRetry
      });

      return { success: true, retryAttempt: currentRetry };

    } catch (error) {
      logger.error('Message processing failed', {
        queueName,
        correlationId,
        retryAttempt: currentRetry,
        error: error.message,
        stack: error.stack
      });

      // Verificar se deve fazer retry
      if (currentRetry < maxRetries) {
        const nextRetry = currentRetry + 1;
        const delay = this.calculateBackoffDelay(nextRetry, baseDelay);
        
        this.retryQueues.set(retryKey, nextRetry);
        
        logger.info('Scheduling message retry', {
          queueName,
          correlationId,
          nextRetry,
          delay,
          maxRetries
        });

        // Agendar retry após delay
        setTimeout(async () => {
          try {
            await this.processWithRetry(handler, message, {
              maxRetries,
              baseDelay,
              queueName,
              correlationId
            });
          } catch (retryError) {
            logger.error('Retry processing failed', {
              queueName,
              correlationId,
              retryAttempt: nextRetry,
              error: retryError.message
            });
          }
        }, delay);

        return { 
          success: false, 
          retryAttempt: currentRetry,
          willRetry: true,
          nextRetryIn: delay 
        };

      } else {
        // Máximo de tentativas atingido - enviar para DLQ
        this.retryQueues.delete(retryKey);
        
        await this.sendToDeadLetterQueue(message, error, {
          queueName,
          correlationId,
          totalRetries: currentRetry
        });

        logger.error('Message failed after max retries - sent to DLQ', {
          queueName,
          correlationId,
          totalRetries: currentRetry,
          error: error.message
        });

        return { 
          success: false, 
          retryAttempt: currentRetry,
          willRetry: false,
          sentToDLQ: true 
        };
      }
    }
  }

  /**
   * Calcular delay com backoff exponencial
   */
  calculateBackoffDelay(retryAttempt, baseDelay) {
    // Backoff exponencial: 1s, 2s, 4s, 8s, ...
    const exponentialDelay = baseDelay * Math.pow(2, retryAttempt - 1);
    
    // Adicionar jitter para evitar thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Enviar mensagem para Dead Letter Queue
   */
  async sendToDeadLetterQueue(originalMessage, error, metadata) {
    try {
      const dlqMessage = {
        originalMessage,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        metadata: {
          ...metadata,
          failedAt: new Date().toISOString(),
          originalQueue: metadata.queueName
        },
        dlqInfo: {
          reason: 'max_retries_exceeded',
          retryCount: metadata.totalRetries
        }
      };

      const dlqRoutingKey = `${metadata.queueName}.failed`;
      
      await eventBus.publishEvent('ecommerce.dlx', dlqRoutingKey, dlqMessage, {
        persistent: true,
        headers: {
          'x-original-queue': metadata.queueName,
          'x-failure-reason': 'max_retries_exceeded',
          'x-retry-count': metadata.totalRetries.toString()
        }
      });

      logger.info('Message sent to Dead Letter Queue', {
        originalQueue: metadata.queueName,
        dlqRoutingKey,
        correlationId: metadata.correlationId
      });

    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', {
        originalQueue: metadata.queueName,
        error: dlqError.message,
        correlationId: metadata.correlationId
      });
    }
  }

  /**
   * Obter estatísticas de retry
   */
  getRetryStats() {
    const stats = {
      activeRetries: this.retryQueues.size,
      retryDetails: []
    };

    for (const [key, retryCount] of this.retryQueues.entries()) {
      const [queueName, correlationId] = key.split(':');
      stats.retryDetails.push({
        queueName,
        correlationId,
        currentRetryCount: retryCount,
        remainingRetries: this.maxRetries - retryCount
      });
    }

    return stats;
  }

  /**
   * Limpar retries antigos (cleanup)
   */
  cleanup() {
    // Em produção, você poderia implementar limpeza baseada em timestamp
    logger.info('Retry handler cleanup executed', {
      activeRetries: this.retryQueues.size
    });
  }
}

// Singleton instance
const retryHandler = new RetryHandler();

// Cleanup periódico (a cada 5 minutos)
setInterval(() => {
  retryHandler.cleanup();
}, 5 * 60 * 1000);

module.exports = retryHandler;
