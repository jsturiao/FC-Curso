const EventBus = require('../../shared/events/EventBus');
const Payment = require('../model');
const PaymentController = require('../controller');
const PaymentEventPublisher = require('./publisher');
const logger = require('../../shared/utils/logger');

class PaymentEventSubscriber {
	/**
	 * Inicializar todos os subscribers
	 */
	static async initialize() {
		try {
			// Subscribir eventos de pedidos
			await EventBus.subscribe('order.created', this.handleOrderCreated.bind(this));
			await EventBus.subscribe('order.cancelled', this.handleOrderCancelled.bind(this));

			// Subscribir eventos de estoque
			await EventBus.subscribe('inventory.reserved', this.handleInventoryReserved.bind(this));
			await EventBus.subscribe('inventory.insufficient', this.handleInventoryInsufficient.bind(this));

			// Subscribir eventos internos de pagamento
			await EventBus.subscribe('payment.retry.requested', this.handlePaymentRetry.bind(this));
			await EventBus.subscribe('payment.timeout', this.handlePaymentTimeout.bind(this));

			logger.info('Payment event subscribers initialized successfully');
		} catch (error) {
			logger.error('Error initializing payment event subscribers', error);
			throw error;
		}
	}

	/**
	 * Lidar com evento de pedido criado
	 * Cria automaticamente um pagamento para o pedido
	 */
	static async handleOrderCreated(eventData) {
		try {
			logger.info('Processing order created event for payment', {
				orderId: eventData.orderId,
				correlationId: eventData.correlationId
			});

			// Verificar se já existe pagamento para este pedido
			const existingPayment = await Payment.findByOrderId(eventData.orderId);
			if (existingPayment) {
				logger.warn('Payment already exists for order', {
					orderId: eventData.orderId,
					paymentId: existingPayment.paymentId
				});
				return;
			}

			// Criar dados do pagamento baseado no pedido
			const paymentData = {
				orderId: eventData.orderId,
				amount: eventData.totalAmount,
				currency: eventData.currency || 'BRL',
				paymentMethod: eventData.paymentMethod || 'credit_card',
				gatewayProvider: 'mock', // Para demonstração
				customerInfo: {
					customerId: eventData.customerId,
					email: eventData.customerEmail || `customer-${eventData.customerId}@example.com`,
					name: eventData.customerName || `Customer ${eventData.customerId}`
				},
				paymentDetails: {
					installments: eventData.installments || 1
				},
				metadata: {
					orderCorrelationId: eventData.correlationId,
					autoCreated: true,
					source: 'order-created-event'
				}
			};

			// Criar pagamento
			const payment = new Payment(paymentData);
			await payment.save();

			logger.info('Payment created automatically from order', {
				paymentId: payment.paymentId,
				orderId: eventData.orderId,
				amount: payment.amount
			});

			// Publicar evento de pagamento criado
			await PaymentEventPublisher.publishPaymentCreated({
				paymentId: payment.paymentId,
				orderId: payment.orderId,
				amount: payment.amount,
				currency: payment.currency,
				paymentMethod: payment.paymentMethod,
				customerId: payment.customerInfo.customerId
			});

			// Auto-processar pagamento após 2 segundos (para demonstração)
			setTimeout(async () => {
				try {
					await PaymentEventSubscriber.autoProcessPayment(payment.paymentId);
				} catch (error) {
					logger.error('Error auto-processing payment', error);
				}
			}, 2000);

		} catch (error) {
			logger.error('Error handling order created event', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Lidar com evento de pedido cancelado
	 * Cancela o pagamento associado se ainda estiver pendente
	 */
	static async handleOrderCancelled(eventData) {
		try {
			logger.info('Processing order cancelled event for payment', {
				orderId: eventData.orderId,
				correlationId: eventData.correlationId
			});

			const payment = await Payment.findByOrderId(eventData.orderId);
			if (!payment) {
				logger.warn('No payment found for cancelled order', {
					orderId: eventData.orderId
				});
				return;
			}

			// Só cancelar se o pagamento ainda estiver pendente ou processando
			if (['pending', 'processing'].includes(payment.status)) {
				await payment.cancel(`Order cancelled: ${eventData.reason}`);

				await PaymentEventPublisher.publishPaymentCancelled({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					reason: `Order cancelled: ${eventData.reason}`,
					cancelledBy: 'order-service'
				});

				logger.info('Payment cancelled due to order cancellation', {
					paymentId: payment.paymentId,
					orderId: eventData.orderId
				});
			} else if (payment.status === 'approved') {
				// Se o pagamento já foi aprovado, processar reembolso
				await payment.refund(null, `Order cancelled: ${eventData.reason}`);

				await PaymentEventPublisher.publishPaymentRefunded({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					originalAmount: payment.amount,
					refundAmount: payment.amount,
					refundReason: `Order cancelled: ${eventData.reason}`,
					customerId: payment.customerInfo.customerId
				});

				logger.info('Payment refunded due to order cancellation', {
					paymentId: payment.paymentId,
					orderId: eventData.orderId
				});
			}

		} catch (error) {
			logger.error('Error handling order cancelled event', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Lidar com evento de estoque reservado
	 * Pode influenciar na aprovação automática de pagamentos
	 */
	static async handleInventoryReserved(eventData) {
		try {
			logger.info('Processing inventory reserved event', {
				orderId: eventData.orderId,
				correlationId: eventData.correlationId
			});

			const payment = await Payment.findByOrderId(eventData.orderId);
			if (!payment) {
				logger.warn('No payment found for inventory reserved event', {
					orderId: eventData.orderId
				});
				return;
			}

			// Se o pagamento estiver aprovado, nada mais a fazer
			if (payment.status === 'approved') {
				logger.info('Payment already approved, inventory reservation noted', {
					paymentId: payment.paymentId,
					orderId: eventData.orderId
				});
				return;
			}

			// Adicionar informação de reserva de estoque aos metadados
			payment.metadata.inventoryReserved = true;
			payment.metadata.inventoryReservationId = eventData.reservationId;
			payment.addTimelineEvent('inventory_reserved', 'Inventory reserved for order items');

			await payment.save();

			logger.info('Inventory reservation recorded in payment', {
				paymentId: payment.paymentId,
				orderId: eventData.orderId,
				reservationId: eventData.reservationId
			});

		} catch (error) {
			logger.error('Error handling inventory reserved event', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Lidar com evento de estoque insuficiente
	 * Cancela pagamentos para pedidos sem estoque
	 */
	static async handleInventoryInsufficient(eventData) {
		try {
			logger.info('Processing inventory insufficient event', {
				orderId: eventData.orderId,
				correlationId: eventData.correlationId
			});

			const payment = await Payment.findByOrderId(eventData.orderId);
			if (!payment) {
				logger.warn('No payment found for inventory insufficient event', {
					orderId: eventData.orderId
				});
				return;
			}

			// Cancelar pagamento se estiver pendente ou processando
			if (['pending', 'processing'].includes(payment.status)) {
				await payment.cancel('Insufficient inventory for order items');

				await PaymentEventPublisher.publishPaymentCancelled({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					reason: 'Insufficient inventory for order items',
					cancelledBy: 'inventory-service'
				});

				logger.info('Payment cancelled due to insufficient inventory', {
					paymentId: payment.paymentId,
					orderId: eventData.orderId
				});
			}

		} catch (error) {
			logger.error('Error handling inventory insufficient event', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Lidar com solicitação de retry de pagamento
	 */
	static async handlePaymentRetry(eventData) {
		try {
			logger.info('Processing payment retry request', {
				paymentId: eventData.paymentId,
				correlationId: eventData.correlationId
			});

			const payment = await Payment.findOne({ paymentId: eventData.paymentId });
			if (!payment) {
				logger.error('Payment not found for retry request', {
					paymentId: eventData.paymentId
				});
				return;
			}

			if (!payment.canRetry) {
				logger.warn('Payment cannot be retried', {
					paymentId: eventData.paymentId,
					status: payment.status,
					attempts: payment.attempts
				});
				return;
			}

			// Processar retry
			await PaymentEventSubscriber.autoProcessPayment(payment.paymentId);

		} catch (error) {
			logger.error('Error handling payment retry request', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Lidar com timeout de pagamento
	 */
	static async handlePaymentTimeout(eventData) {
		try {
			logger.info('Processing payment timeout', {
				paymentId: eventData.paymentId,
				correlationId: eventData.correlationId
			});

			const payment = await Payment.findOne({ paymentId: eventData.paymentId });
			if (!payment) {
				logger.error('Payment not found for timeout event', {
					paymentId: eventData.paymentId
				});
				return;
			}

			if (payment.status === 'processing') {
				await payment.cancel('Payment processing timeout');

				await PaymentEventPublisher.publishPaymentCancelled({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					reason: 'Payment processing timeout',
					cancelledBy: 'system'
				});

				logger.warn('Payment cancelled due to timeout', {
					paymentId: payment.paymentId,
					orderId: payment.orderId
				});
			}

		} catch (error) {
			logger.error('Error handling payment timeout', {
				error: error.message,
				eventData
			});
		}
	}

	/**
	 * Auto-processar pagamento (para demonstração)
	 */
	static async autoProcessPayment(paymentId) {
		try {
			const payment = await Payment.findOne({ paymentId });
			if (!payment || payment.status !== 'pending') {
				return;
			}

			logger.info('Auto-processing payment', {
				paymentId: payment.paymentId,
				orderId: payment.orderId
			});

			// Marcar como processando
			await payment.process();

			// Simular processamento
			const gatewayResult = await PaymentController.simulateGatewayProcessing(payment);

			if (gatewayResult.success) {
				await payment.approve(gatewayResult.response);

				await PaymentEventPublisher.publishPaymentApproved({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					netAmount: payment.netAmount,
					gatewayTransactionId: payment.gatewayTransactionId,
					authorizationCode: gatewayResult.response.authorizationCode,
					fees: payment.fees,
					paymentMethod: payment.paymentMethod,
					gatewayProvider: payment.gatewayProvider,
					customerId: payment.customerInfo.customerId
				});

				logger.info('Payment auto-approved', {
					paymentId: payment.paymentId,
					orderId: payment.orderId
				});
			} else {
				await payment.decline(gatewayResult.reason, gatewayResult.response);

				await PaymentEventPublisher.publishPaymentDeclined({
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					amount: payment.amount,
					reason: gatewayResult.reason,
					errorCode: gatewayResult.response.code,
					canRetry: payment.canRetry,
					attempts: payment.attempts,
					paymentMethod: payment.paymentMethod,
					gatewayProvider: payment.gatewayProvider,
					customerId: payment.customerInfo.customerId
				});

				logger.warn('Payment auto-declined', {
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					reason: gatewayResult.reason
				});
			}

		} catch (error) {
			logger.error('Error auto-processing payment', {
				error: error.message,
				paymentId
			});
		}
	}
}

module.exports = PaymentEventSubscriber;
