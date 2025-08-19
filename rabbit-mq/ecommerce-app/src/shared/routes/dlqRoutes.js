const express = require('express');
const dlqManager = require('../../shared/events/DeadLetterQueueManager');
const retryHandler = require('../../shared/events/RetryHandler');
const logger = require('../../shared/utils/logger');

const router = express.Router();

// Middleware para verificar se DLQ está inicializada
router.use((req, res, next) => {
  if (!dlqManager.isReady()) {
    return res.status(503).json({
      success: false,
      error: 'Dead Letter Queue Manager not initialized',
      message: 'Service temporarily unavailable'
    });
  }
  next();
});

/**
 * GET /api/dlq/messages
 * Listar mensagens na Dead Letter Queue
 */
router.get('/messages', async (req, res) => {
  try {
    const { status, queue, limit, offset } = req.query;
    
    const options = {
      status,
      queueName: queue,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    const result = dlqManager.getDLQMessages(options);

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    logger.error('Error getting DLQ messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ messages',
      details: error.message
    });
  }
});

/**
 * GET /api/dlq/messages/:dlqId
 * Obter mensagem específica da DLQ
 */
router.get('/messages/:dlqId', async (req, res) => {
  try {
    const { dlqId } = req.params;
    const dlqMessage = dlqManager.getDLQMessage(dlqId);

    if (!dlqMessage) {
      return res.status(404).json({
        success: false,
        error: 'DLQ message not found',
        dlqId
      });
    }

    res.json({
      success: true,
      data: dlqMessage
    });

  } catch (error) {
    logger.error('Error getting DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ message',
      details: error.message
    });
  }
});

/**
 * POST /api/dlq/messages/:dlqId/reprocess
 * Reprocessar mensagem da DLQ
 */
router.post('/messages/:dlqId/reprocess', async (req, res) => {
  try {
    const { dlqId } = req.params;
    const result = await dlqManager.reprocessDLQMessage(dlqId);

    if (result.success) {
      res.json({
        success: true,
        message: 'DLQ message reprocessed successfully',
        data: {
          dlqId,
          status: result.dlqMessage.status,
          reprocessAttempts: result.dlqMessage.reprocessAttempts
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to reprocess DLQ message',
        details: result.error
      });
    }

  } catch (error) {
    logger.error('Error reprocessing DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reprocess DLQ message',
      details: error.message
    });
  }
});

/**
 * DELETE /api/dlq/messages/:dlqId
 * Remover mensagem da DLQ
 */
router.delete('/messages/:dlqId', async (req, res) => {
  try {
    const { dlqId } = req.params;
    const result = await dlqManager.removeDLQMessage(dlqId);

    if (result.success) {
      res.json({
        success: true,
        message: 'DLQ message removed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to remove DLQ message',
        details: result.error
      });
    }

  } catch (error) {
    logger.error('Error removing DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove DLQ message',
      details: error.message
    });
  }
});

/**
 * GET /api/dlq/stats
 * Obter estatísticas da DLQ
 */
router.get('/stats', async (req, res) => {
  try {
    const dlqStats = dlqManager.getDLQStats();
    const retryStats = retryHandler.getRetryStats();

    res.json({
      success: true,
      data: {
        dlq: dlqStats,
        retry: retryStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting DLQ stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ stats',
      details: error.message
    });
  }
});

/**
 * POST /api/dlq/bulk/reprocess
 * Reprocessar múltiplas mensagens
 */
router.post('/bulk/reprocess', async (req, res) => {
  try {
    const { dlqIds } = req.body;

    if (!Array.isArray(dlqIds) || dlqIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'dlqIds must be a non-empty array'
      });
    }

    const results = [];
    
    for (const dlqId of dlqIds) {
      const result = await dlqManager.reprocessDLQMessage(dlqId);
      results.push({
        dlqId,
        success: result.success,
        error: result.error || null
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Bulk reprocess completed: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
        results
      }
    });

  } catch (error) {
    logger.error('Error bulk reprocessing DLQ messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk reprocess DLQ messages',
      details: error.message
    });
  }
});

/**
 * GET /api/dlq/health
 * Health check da DLQ
 */
router.get('/health', async (req, res) => {
  try {
    const dlqStats = dlqManager.getDLQStats();
    const retryStats = retryHandler.getRetryStats();

    res.json({
      success: true,
      status: 'healthy',
      data: {
        dlqManager: {
          initialized: dlqManager.isReady(),
          totalMessages: dlqStats.total,
          failedMessages: dlqStats.byStatus.failed || 0
        },
        retryHandler: {
          activeRetries: retryStats.activeRetries
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting DLQ health:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
