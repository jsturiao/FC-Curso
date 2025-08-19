const OrderEventSubscriber = require('./events/subscriber');
const OrderRoutes = require('./routes');
const logger = require('../shared/utils/logger');

class OrderModule {
	/**
	 * Inicializar módulo de pedidos
	 */
	static async initialize() {
		try {
			logger.info('Initializing Order Module...');

			// Inicializar subscribers de eventos
			await OrderEventSubscriber.initialize();

			logger.info('Order Module initialized successfully');

			return {
				routes: OrderRoutes,
				subscribers: OrderEventSubscriber
			};
		} catch (error) {
			logger.error('Error initializing Order Module', error);
			throw error;
		}
	}

	/**
	 * Obter informações do módulo
	 */
	static getModuleInfo() {
		return {
			name: 'Order Module',
			version: '1.0.0',
			description: 'Complete order management system with RabbitMQ integration',
			features: [
				'Order creation and management',
				'Order status tracking',
				'Event-driven architecture',
				'Payment integration',
				'Inventory integration',
				'Real-time order updates'
			],
			events: {
				publishes: [
					'order.created',
					'order.confirmed',
					'order.cancelled',
					'order.updated'
				],
				subscribes: [
					'payment.approved',
					'payment.declined',
					'inventory.reserved',
					'inventory.insufficient'
				]
			},
			endpoints: [
				'POST /api/orders - Create order',
				'GET /api/orders - List orders',
				'GET /api/orders/:id - Get order',
				'PUT /api/orders/:id - Update order',
				'DELETE /api/orders/:id - Cancel order'
			]
		};
	}

	/**
	 * Verificar saúde do módulo
	 */
	static async healthCheck() {
		try {
			const Order = require('./model');

			// Verificar conexão com banco
			const orderCount = await Order.countDocuments();

			// Verificar estatísticas básicas
			const stats = await Order.aggregate([
				{
					$group: {
						_id: '$status',
						count: { $sum: 1 },
						totalAmount: { $sum: '$totalAmount' }
					}
				}
			]);

			return {
				status: 'healthy',
				module: 'orders',
				timestamp: new Date(),
				metrics: {
					totalOrders: orderCount,
					statusDistribution: stats
				}
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				module: 'orders',
				timestamp: new Date(),
				error: error.message
			};
		}
	}
}

module.exports = OrderModule;
