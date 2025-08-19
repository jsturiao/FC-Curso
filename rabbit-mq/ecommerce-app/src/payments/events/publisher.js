const EventBus = require('../../shared/events/EventBus');
const logger = require('../../shared/utils/logger');

class PaymentEventPublisher {
	/**
	 * Publicar evento de pagamento criado
	 */
	static async publishPaymentCreated(paymentData) {
		try {
			const event = {
				eventType: 'payment.created',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				currency: paymentData.currency,
				paymentMethod: paymentData.paymentMethod,
				customerId: paymentData.customerId,
				status: 'pending',
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0'
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.created');

			logger.info('Payment created event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment created event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de pagamento processado
	 */
	static async publishPaymentProcessed(paymentData) {
		try {
			const event = {
				eventType: 'payment.processed',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				status: paymentData.status,
				gatewayTransactionId: paymentData.gatewayTransactionId,
				processingTime: paymentData.processingTime,
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0',
					gatewayProvider: paymentData.gatewayProvider
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.processed');

			logger.info('Payment processed event published', {
				paymentId: paymentData.paymentId,
				status: paymentData.status,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment processed event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de pagamento aprovado
	 */
	static async publishPaymentApproved(paymentData) {
		try {
			const event = {
				eventType: 'payment.approved',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				netAmount: paymentData.netAmount,
				gatewayTransactionId: paymentData.gatewayTransactionId,
				authorizationCode: paymentData.authorizationCode,
				fees: paymentData.fees,
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0',
					paymentMethod: paymentData.paymentMethod,
					gatewayProvider: paymentData.gatewayProvider
				}
			};

			// Publicar no exchange principal
			await EventBus.publish('ecommerce.events', event, 'payment.approved');

			// Também publicar notificação para clientes
			await EventBus.publish('ecommerce.notifications', {
				type: 'payment_approved',
				userId: paymentData.customerId,
				orderId: paymentData.orderId,
				paymentId: paymentData.paymentId,
				amount: paymentData.amount,
				message: `Pagamento de R$ ${paymentData.amount.toFixed(2)} aprovado com sucesso!`,
				timestamp: new Date()
			});

			logger.info('Payment approved event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment approved event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de pagamento recusado
	 */
	static async publishPaymentDeclined(paymentData) {
		try {
			const event = {
				eventType: 'payment.declined',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				reason: paymentData.reason,
				errorCode: paymentData.errorCode,
				canRetry: paymentData.canRetry,
				attempts: paymentData.attempts,
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0',
					paymentMethod: paymentData.paymentMethod,
					gatewayProvider: paymentData.gatewayProvider
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.declined');

			// Notificar sobre pagamento recusado
			await EventBus.publish('ecommerce.notifications', {
				type: 'payment_declined',
				userId: paymentData.customerId,
				orderId: paymentData.orderId,
				paymentId: paymentData.paymentId,
				reason: paymentData.reason,
				canRetry: paymentData.canRetry,
				message: `Pagamento recusado: ${paymentData.reason}`,
				timestamp: new Date()
			});

			logger.warn('Payment declined event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				reason: paymentData.reason,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment declined event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de pagamento cancelado
	 */
	static async publishPaymentCancelled(paymentData) {
		try {
			const event = {
				eventType: 'payment.cancelled',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				reason: paymentData.reason,
				cancelledBy: paymentData.cancelledBy || 'system',
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0'
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.cancelled');

			logger.info('Payment cancelled event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				reason: paymentData.reason,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment cancelled event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de reembolso processado
	 */
	static async publishPaymentRefunded(paymentData) {
		try {
			const event = {
				eventType: 'payment.refunded',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				originalAmount: paymentData.originalAmount,
				refundAmount: paymentData.refundAmount,
				refundReason: paymentData.refundReason,
				refundId: paymentData.refundId,
				isPartialRefund: paymentData.refundAmount < paymentData.originalAmount,
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0',
					refundMethod: paymentData.refundMethod || 'original_payment_method'
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.refunded');

			// Notificar sobre reembolso
			await EventBus.publish('ecommerce.notifications', {
				type: 'payment_refunded',
				userId: paymentData.customerId,
				orderId: paymentData.orderId,
				paymentId: paymentData.paymentId,
				refundAmount: paymentData.refundAmount,
				reason: paymentData.refundReason,
				message: `Reembolso de R$ ${paymentData.refundAmount.toFixed(2)} processado com sucesso!`,
				timestamp: new Date()
			});

			logger.info('Payment refunded event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				refundAmount: paymentData.refundAmount,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment refunded event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}

	/**
	 * Publicar evento de falha no pagamento
	 */
	static async publishPaymentFailed(paymentData) {
		try {
			const event = {
				eventType: 'payment.failed',
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				amount: paymentData.amount,
				error: paymentData.error,
				attempts: paymentData.attempts,
				maxAttempts: paymentData.maxAttempts,
				canRetry: paymentData.canRetry,
				timestamp: new Date(),
				correlationId: `payment-${paymentData.paymentId}`,
				metadata: {
					source: 'payment-service',
					version: '1.0',
					errorType: paymentData.errorType || 'processing_error'
				}
			};

			await EventBus.publish('ecommerce.events', event, 'payment.failed');

			logger.error('Payment failed event published', {
				paymentId: paymentData.paymentId,
				orderId: paymentData.orderId,
				error: paymentData.error,
				correlationId: event.correlationId
			});

			return event;
		} catch (error) {
			logger.error('Error publishing payment failed event', {
				error: error.message,
				paymentData
			});
			throw error;
		}
	}
}

module.exports = PaymentEventPublisher;
