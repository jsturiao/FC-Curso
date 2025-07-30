import express from 'express';
import dotenv from 'dotenv';
import 'reflect-metadata';

// API Factory
import APIFactory from './factories/api.factory';

// Middlewares da API
import requestLogger from './api/middlewares/request-logger.middleware';
import errorHandler from './api/middlewares/error-handler.middleware';

// Routes da API
import productsRoutes from './api/routes/products.routes';
import clientsRoutes from './api/routes/clients.routes';
import checkoutRoutes from './api/routes/checkout.routes';
import invoiceRoutes from './api/routes/invoice.routes';

// Configurar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rota de health check com verificação da APIFactory
app.get('/health', async (req, res) => {
  const apiHealth = await APIFactory.healthCheck();
  
  res.status(200).json({
    status: 'OK',
    message: 'FC Monolito está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    api: apiHealth
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Bem-vindo ao FC Monolito!',
    version: '1.0.0',
    docs: '/health para verificar status',
    endpoints: {
      products: 'POST /products',
      clients: 'POST /clients', 
      checkout: 'POST /checkout',
      invoice: 'GET /invoice/:id'
    }
  });
});

// Rotas da API
app.use('/products', productsRoutes);
app.use('/clients', clientsRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/invoice', invoiceRoutes);

// Middleware de tratamento de erros (deve vir por último)
app.use(errorHandler);

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    availableEndpoints: {
      products: 'POST /products',
      clients: 'POST /clients', 
      checkout: 'POST /checkout',
      invoice: 'GET /invoice/:id'
    }
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  
  // Inicializar APIFactory
  try {
    await APIFactory.initialize();
    console.log('🏭 APIFactory inicializada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar APIFactory:', error);
  }
});

export default app;
