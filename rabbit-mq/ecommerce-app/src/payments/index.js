const PaymentEventSubscriber = require('./events/subscriber');
const PaymentRoutes = require('./routes');
const logger = require('../shared/utils/logger');

class PaymentModule {
	/**
	 * Inicializar módulo de pagamentos
	 */
	static async initialize() {
		try {
			logger.info('Initializing Payment Module...');

			// Inicializar subscribers de eventos
			await PaymentEventSubscriber.initialize();

			logger.info('Payment Module initialized successfully');

			return {
				routes: PaymentRoutes,
				subscribers: PaymentEventSubscriber
			};
		} catch (error) {
			logger.error('Error initializing Payment Module', error);
			throw error;
		}
	}

	/**
	 * Obter informações do módulo
	 */
	static getModuleInfo() {
		return {
			name: 'Payment Module',
			version: '1.0.0',
			description: 'Complete payment processing system with RabbitMQ integration',
			features: [
				'Payment creation and processing',
				'Multiple payment methods support',
				'Gateway simulation',
				'Automatic refunds',
				'Event-driven architecture',
				'Payment retry logic',
				'Comprehensive payment tracking'
			],
			events: {
				publishes: [
					'payment.created',
					'payment.processed',
					'payment.approved',
					'payment.declined',
					'payment.cancelled',
					'payment.refunded',
					'payment.failed'
				],
				subscribes: [
					'order.created',
					'order.cancelled',
					'inventory.reserved',
					'inventory.insufficient',
					'payment.retry.requested',
					'payment.timeout'
				]
			},
			endpoints: [
				'POST /api/payments - Create payment',
				'GET /api/payments - List payments',
				'GET /api/payments/stats - Payment statistics',
				'GET /api/payments/:id - Get payment',
				'POST /api/payments/:id/process - Process payment',
				'POST /api/payments/:id/cancel - Cancel payment',
				'POST /api/payments/:id/refund - Refund payment'
			]
		};
	}

	/**
	 * Verificar saúde do módulo
	 */
	static async healthCheck() {
		try {
			const Payment = require('./model');

			// Verificar conexão com banco
			const paymentCount = await Payment.countDocuments();

			// Verificar estatísticas básicas
			const stats = await Payment.getPaymentStats();

			return {
				status: 'healthy',
				module: 'payments',
				timestamp: new Date(),
				metrics: {
					totalPayments: paymentCount,
					statusDistribution: stats
				}
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				module: 'payments',
				timestamp: new Date(),
				error: error.message
			};
		}
	}
}

module.exports = PaymentModule;
