require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');

// Import configurations
const { connectDatabase } = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./shared/utils/logger');
const eventBus = require('./shared/events/EventBus');
const dlqManager = require('./shared/events/DeadLetterQueueManager');
const retryHandler = require('./shared/events/RetryHandler');

// Import modules  
const ordersModule = require('./modules/orders');
const paymentsRoutes = require('./modules/payments/routes');
const notificationsRoutes = require('./modules/notifications/routes');
const inventoryModule = require('./modules/inventory');

// Import DLQ routes
const dlqRoutes = require('./shared/routes/dlqRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Environment variables
const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global middleware
// Para desenvolvimento, desabilitamos completamente o helmet CSP
if (NODE_ENV === 'development') {
  // Sem helmet CSP em desenvolvimento para evitar problemas
  app.use((req, res, next) => {
    // Remove qualquer header CSP que possa existir
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    next();
  });
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "'unsafe-hashes'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net"
        ],
        connectSrc: ["'self'", "ws:", "wss:"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  }));
}
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for dashboard
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/orders', ordersModule.routes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
// Note: inventory routes are configured after module initialization (see line ~450)
app.use('/api/dlq', dlqRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { isConnected, getConnectionStatus } = require('./config/rabbitmq');
    const ordersHealth = await ordersModule.healthCheck();
    const dlqStats = dlqManager.getDLQStats();
    const retryStats = retryHandler.getRetryStats();

    const rabbitmqStatus = getConnectionStatus();
    const mongoStatus = mongoose.connection.readyState === 1;

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        rabbitmq: rabbitmqStatus.connected,
        mongodb: mongoStatus,
        orders: ordersHealth.status === 'healthy',
        dlqManager: dlqManager.isReady()
      },
      modules: {
        orders: ordersHealth,
        dlq: {
          totalMessages: dlqStats.total,
          failedMessages: dlqStats.byStatus.failed || 0,
          activeRetries: retryStats.activeRetries
        },
        rabbitmq: rabbitmqStatus,
        mongodb: {
          connected: mongoStatus,
          readyState: mongoose.connection.readyState,
          state: mongoose.STATES[mongoose.connection.readyState]
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const ordersStats = await ordersModule.getStats();
    // const paymentsStats = await PaymentModule.healthCheck();
    const inventoryStats = await inventoryModule.getHealthCheck();

    res.json({
      success: true,
      data: {
        // totalMessages: messageLogger.getStats().totalMessages,
        activeOrders: ordersStats.totalOrders,
        totalPayments: 0, // paymentsStats.metrics?.totalPayments || 0,
        totalProducts: inventoryStats.statistics?.totalProducts || 0,
        lowStockCount: inventoryStats.statistics?.lowStockCount || 0,
        totalNotifications: 0, // Will be implemented in next etapa
        orders: ordersStats,
        // payments: paymentsStats.metrics,
        inventory: inventoryStats.statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Stats retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// EventBus test routes
app.use('/api/eventbus/test', require('./shared/events/testRoutes'));

// EventBus API routes
app.get('/api/eventbus/status', (req, res) => {
  res.json(eventBus.getStatus());
});

app.get('/api/eventbus/subscribers', (req, res) => {
  res.json(eventBus.getSubscribers());
});

// Message logging API
const messageLogger = require('./shared/events/messageLogger');

app.get('/api/messages/logs', async (req, res) => {
  try {
    const { page, limit, action, exchange, routingKey, correlationId } = req.query;
    const result = await messageLogger.getMessageLogs(
      { action, exchange, routingKey, correlationId },
      { page: parseInt(page) || 1, limit: parseInt(limit) || 50 }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/stats', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    const stats = await messageLogger.getMessageStats(timeframe);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/flow/:correlationId', async (req, res) => {
  try {
    const { correlationId } = req.params;
    const flow = await messageLogger.getMessageFlow(correlationId);
    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await messageLogger.getRecentActivity(parseInt(limit));
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to dashboard', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected from dashboard', { socketId: socket.id });
  });
});

// Setup message broadcasting to dashboard
messageLogger.on('message-logged', (message) => {
  // Transform data to match dashboard expectations
  const dashboardMessage = {
    ...message,
    type: message.routingKey.split('.')[0], // Extract type from routing key (e.g., "order" from "order.created")
    event: message.routingKey, // The full routing key as event name
    timestamp: message.timestamp
  };

  // Emit generic message event
  io.emit('message_received', dashboardMessage);
  
  // Emit specific events based on exchange and routing key
  if (message.exchange === 'ecommerce.events' || message.eventType.includes('order')) {
    if (message.eventType.includes('created')) {
      io.emit('order_created', dashboardMessage);
    } else if (message.eventType.includes('updated')) {
      io.emit('order_updated', dashboardMessage);
    }
  }
  
  if (message.exchange === 'ecommerce.payments' || message.eventType.includes('payment')) {
    io.emit('payment_processed', dashboardMessage);
  }
  
  if (message.exchange === 'ecommerce.notifications' || message.eventType.includes('notification')) {
    io.emit('notification_sent', dashboardMessage);
  }
  
  if (message.exchange === 'ecommerce.inventory' || message.eventType.includes('inventory')) {
    io.emit('inventory_updated', dashboardMessage);
  }
});

// Broadcast stats every 30 seconds
setInterval(async () => {
  try {
    const ordersStats = await ordersModule.getStats();
    const stats = {
      totalMessages: messageLogger.getStats().totalMessages,
      activeOrders: ordersStats.totalOrders,
      totalPayments: 0,
      totalNotifications: 0
    };
    io.emit('stats', stats);
  } catch (error) {
    logger.error('Error broadcasting stats:', error);
  }
}, 30000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    service: 'E-commerce RabbitMQ App',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    modules: {
      orders: 'active',
      payments: 'active',
      notifications: 'active',
      inventory: 'active'
    },
    eventBus: eventBus.getStatus()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Socket.IO for real-time dashboard updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available globally for modules
global.io = io;

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connection
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }

  // Close RabbitMQ connection
  try {
    const { closeConnection } = require('./config/rabbitmq');
    await closeConnection();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }

  process.exit(0);
}

// Initialize application
async function startApplication() {
  try {
    logger.info('Starting E-commerce RabbitMQ Application...');

    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');

    // Connect to RabbitMQ
    await connectRabbitMQ();
    logger.info('✅ RabbitMQ connected');

    // Initialize EventBus
    await eventBus.initialize();
    logger.info('✅ EventBus initialized');

    // Initialize modules
    await initializeModules();
    logger.info('✅ All modules initialized');

    // Initialize DLQ Manager
    await dlqManager.initialize();
    logger.info('✅ Dead Letter Queue Manager initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api`);
      logger.info(`🐰 RabbitMQ Management: http://localhost:15672`);
      logger.info(`📁 Environment: ${NODE_ENV}`);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Initialize all modules
async function initializeModules() {
  try {
    // Initialize all modules
    await ordersModule.initialize();
    // await paymentsModule.initialize(); // placeholder - no initialization needed
    // await notificationsModule.initialize(); // placeholder - no initialization needed

    // Initialize inventory module
    const inventoryModuleInstance = await inventoryModule.initialize();

    // Configure routes after initialization
    app.use('/api/orders', require('./modules/orders/routes'));
    app.use('/api/payments', require('./modules/payments/routes'));
    app.use('/api/notifications', require('./modules/notifications/routes'));

    if (inventoryModuleInstance && inventoryModuleInstance.routes) {
      app.use('/api/inventory', inventoryModuleInstance.routes);
    }

    logger.info('All modules initialized successfully');
  } catch (error) {
    logger.error('Error initializing modules:', error);
    throw error;
  }
}

// Start the application
if (require.main === module) {
  startApplication();
}

module.exports = { app, server, io };
