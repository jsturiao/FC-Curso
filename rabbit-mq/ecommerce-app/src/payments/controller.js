const Payment = require('./model');
const Joi = require('joi');
const logger = require('../shared/utils/logger');
const EventBus = require('../shared/events/EventBus');

// Schema de validação para criação de pagamento
const createPaymentSchema = Joi.object({
	orderId: Joi.string().required(),
	amount: Joi.number().positive().required(),
	currency: Joi.string().valid('BRL', 'USD', 'EUR').default('BRL'),
	paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'pix', 'boleto', 'paypal').required(),
	gatewayProvider: Joi.string().valid('stripe', 'mercadopago', 'pagseguro', 'mock').default('mock'),
	customerInfo: Joi.object({
		customerId: Joi.string().required(),
		email: Joi.string().email().required(),
		name: Joi.string().required()
	}).required(),
	paymentDetails: Joi.object({
		cardLast4: Joi.string().length(4),
		cardBrand: Joi.string(),
		installments: Joi.number().integer().min(1).max(24).default(1),
		authorizationCode: Joi.string()
	}).optional(),
	metadata: Joi.object().optional()
});

// Schema para processamento de pagamento
const processPaymentSchema = Joi.object({
	gatewayData: Joi.object().optional()
});

// Schema para reembolso
const refundSchema = Joi.object({
	amount: Joi.number().positive().optional(),
	reason: Joi.string().required()
});

class PaymentController {
	// Criar novo pagamento
	static async createPayment(req, res) {
		try {
			const { error, value } = createPaymentSchema.validate(req.body);
			if (error) {
				return res.status(400).json({
					error: 'Validation failed',
					details: error.details
				});
			}

			// Verificar se já existe pagamento para este pedido
			const existingPayment = await Payment.findByOrderId(value.orderId);
			if (existingPayment) {
				return res.status(409).json({
					error: 'Payment already exists for this order',
					paymentId: existingPayment.paymentId
				});
			}

			const payment = new Payment(value);
			await payment.save();

			logger.info('Payment created', {
				paymentId: payment.paymentId,
				orderId: payment.orderId,
				amount: payment.amount
			});

			// Publicar evento de pagamento criado
			EventBus.publish('payment.created', {
				paymentId: payment.paymentId,
				orderId: payment.orderId,
				amount: payment.amount,
				paymentMethod: payment.paymentMethod,
				customerId: payment.customerInfo.customerId,
				timestamp: new Date()
			});

			res.status(201).json({
				success: true,
				payment: {
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					status: payment.status,
					paymentMethod: payment.paymentMethod,
					createdAt: payment.createdAt
				}
			});
		} catch (error) {
			logger.error('Error creating payment', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Obter pagamento por ID
	static async getPayment(req, res) {
		try {
			const { paymentId } = req.params;

			const payment = await Payment.findOne({ paymentId });
			if (!payment) {
				return res.status(404).json({
					error: 'Payment not found'
				});
			}

			res.json({
				success: true,
				payment
			});
		} catch (error) {
			logger.error('Error fetching payment', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Listar pagamentos com filtros
	static async listPayments(req, res) {
		try {
			const {
				status,
				orderId,
				customerId,
				paymentMethod,
				page = 1,
				limit = 20
			} = req.query;

			const query = {};
			if (status) query.status = status;
			if (orderId) query.orderId = orderId;
			if (customerId) query['customerInfo.customerId'] = customerId;
			if (paymentMethod) query.paymentMethod = paymentMethod;

			const payments = await Payment.find(query)
				.sort({ createdAt: -1 })
				.limit(limit * 1)
				.skip((page - 1) * limit);

			const total = await Payment.countDocuments(query);

			res.json({
				success: true,
				payments,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit)
				}
			});
		} catch (error) {
			logger.error('Error listing payments', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Processar pagamento
	static async processPayment(req, res) {
		try {
			const { paymentId } = req.params;
			const { error, value } = processPaymentSchema.validate(req.body);

			if (error) {
				return res.status(400).json({
					error: 'Validation failed',
					details: error.details
				});
			}

			const payment = await Payment.findOne({ paymentId });
			if (!payment) {
				return res.status(404).json({
					error: 'Payment not found'
				});
			}

			if (payment.status !== 'pending') {
				return res.status(400).json({
					error: 'Payment cannot be processed',
					currentStatus: payment.status
				});
			}

			// Marcar como processando
			await payment.process();

			// Simular processamento do gateway
			const gatewayResult = await PaymentController.simulateGatewayProcessing(payment, value.gatewayData);

			if (gatewayResult.success) {
				await payment.approve(gatewayResult.response);

				// Publicar evento de pagamento aprovado
				EventBus.publish('payment.approved', {
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					gatewayTransactionId: payment.gatewayTransactionId,
					timestamp: new Date()
				});

				logger.info('Payment approved', {
					paymentId: payment.paymentId,
					orderId: payment.orderId
				});
			} else {
				await payment.decline(gatewayResult.reason, gatewayResult.response);

				// Publicar evento de pagamento recusado
				EventBus.publish('payment.declined', {
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					reason: gatewayResult.reason,
					timestamp: new Date()
				});

				logger.warn('Payment declined', {
					paymentId: payment.paymentId,
					reason: gatewayResult.reason
				});
			}

			res.json({
				success: true,
				payment: {
					paymentId: payment.paymentId,
					status: payment.status,
					gatewayTransactionId: payment.gatewayTransactionId
				}
			});
		} catch (error) {
			logger.error('Error processing payment', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Cancelar pagamento
	static async cancelPayment(req, res) {
		try {
			const { paymentId } = req.params;
			const { reason } = req.body;

			const payment = await Payment.findOne({ paymentId });
			if (!payment) {
				return res.status(404).json({
					error: 'Payment not found'
				});
			}

			if (!['pending', 'processing'].includes(payment.status)) {
				return res.status(400).json({
					error: 'Payment cannot be cancelled',
					currentStatus: payment.status
				});
			}

			await payment.cancel(reason);

			// Publicar evento de pagamento cancelado
			EventBus.publish('payment.cancelled', {
				paymentId: payment.paymentId,
				orderId: payment.orderId,
				reason: reason || 'Payment cancelled by request',
				timestamp: new Date()
			});

			logger.info('Payment cancelled', {
				paymentId: payment.paymentId,
				reason
			});

			res.json({
				success: true,
				message: 'Payment cancelled successfully'
			});
		} catch (error) {
			logger.error('Error cancelling payment', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Processar reembolso
	static async refundPayment(req, res) {
		try {
			const { paymentId } = req.params;
			const { error, value } = refundSchema.validate(req.body);

			if (error) {
				return res.status(400).json({
					error: 'Validation failed',
					details: error.details
				});
			}

			const payment = await Payment.findOne({ paymentId });
			if (!payment) {
				return res.status(404).json({
					error: 'Payment not found'
				});
			}

			if (payment.status !== 'approved') {
				return res.status(400).json({
					error: 'Only approved payments can be refunded',
					currentStatus: payment.status
				});
			}

			const refundAmount = value.amount || payment.amount;
			if (refundAmount > payment.amount) {
				return res.status(400).json({
					error: 'Refund amount cannot exceed payment amount'
				});
			}

			await payment.refund(refundAmount, value.reason);

			// Publicar evento de reembolso
			EventBus.publish('payment.refunded', {
				paymentId: payment.paymentId,
				orderId: payment.orderId,
				refundAmount,
				reason: value.reason,
				timestamp: new Date()
			});

			logger.info('Payment refunded', {
				paymentId: payment.paymentId,
				amount: refundAmount,
				reason: value.reason
			});

			res.json({
				success: true,
				message: 'Refund processed successfully',
				refundAmount
			});
		} catch (error) {
			logger.error('Error processing refund', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Obter estatísticas de pagamentos
	static async getPaymentStats(req, res) {
		try {
			const stats = await Payment.getPaymentStats();

			const totalStats = await Payment.aggregate([
				{
					$group: {
						_id: null,
						totalPayments: { $sum: 1 },
						totalAmount: { $sum: '$amount' },
						avgAmount: { $avg: '$amount' }
					}
				}
			]);

			res.json({
				success: true,
				statistics: {
					byStatus: stats,
					overall: totalStats[0] || { totalPayments: 0, totalAmount: 0, avgAmount: 0 }
				}
			});
		} catch (error) {
			logger.error('Error fetching payment stats', error);
			res.status(500).json({
				error: 'Internal server error',
				message: error.message
			});
		}
	}

	// Simular processamento do gateway (para fins de demonstração)
	static async simulateGatewayProcessing(payment, gatewayData = {}) {
		// Simular delay do gateway
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Simular diferentes cenários baseado no valor
		const amount = payment.amount;
		const random = Math.random();

		// Simular taxas do gateway
		const gatewayFee = amount * 0.029; // 2.9%
		const platformFee = amount * 0.01;  // 1%

		payment.fees.gateway = gatewayFee;
		payment.fees.platform = platformFee;

		// Simular diferentes resultados baseado em regras
		if (amount > 10000) {
			// Valores altos têm maior chance de recusa
			if (random < 0.3) {
				return {
					success: false,
					reason: 'High value transaction rejected by risk analysis',
					response: {
						code: 'RISK_REJECTED',
						message: 'Transaction blocked by fraud prevention'
					}
				};
			}
		}

		if (payment.paymentMethod === 'credit_card' && random < 0.1) {
			// 10% de chance de recusa para cartão de crédito
			return {
				success: false,
				reason: 'Insufficient funds',
				response: {
					code: 'INSUFFICIENT_FUNDS',
					message: 'Card declined by issuer'
				}
			};
		}

		// Sucesso
		return {
			success: true,
			response: {
				transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				authorizationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
				processingTime: Math.floor(Math.random() * 3000) + 500,
				fees: {
					gateway: gatewayFee,
					platform: platformFee
				}
			}
		};
	}
}

module.exports = PaymentController;
