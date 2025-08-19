const logger = require('../../shared/utils/logger');
const { EVENTS } = require('../../shared/events/events');

class OrderEventSubscriber {
	/**
	 * Handle payment processed event
	 */
	async handlePaymentProcessed(message, rawMessage) {
		try {
			const { data } = message;
			const { orderId, paymentId, amount, currency, paymentMethod, transactionId, status } = data;

			logger.info('Orders module processing payment event', {
				orderId,
				paymentId,
				status,
				messageId: message.id
			});

			// Delegate to legacy order module for now
			const legacyOrderSubscriber = require('../../modules/orders/events/subscriber');
			await legacyOrderSubscriber.handlePaymentProcessed(message, rawMessage);

		} catch (error) {
			logger.error('Error handling payment processed event:', error);
			throw error;
		}
	}

	/**
	 * Handle payment failed event
	 */
	async handlePaymentFailed(message, rawMessage) {
		try {
			const { data } = message;
			const { orderId, paymentId, reason } = data;

			logger.info('Orders module processing payment failed event', {
				orderId,
				paymentId,
				reason,
				messageId: message.id
			});

			// Delegate to legacy order module for now
			const legacyOrderSubscriber = require('../../modules/orders/events/subscriber');
			await legacyOrderSubscriber.handlePaymentFailed(message, rawMessage);

		} catch (error) {
			logger.error('Error handling payment failed event:', error);
			throw error;
		}
	}

	/**
	 * Handle inventory reserved event
	 */
	async handleInventoryReserved(message, rawMessage) {
		try {
			const { data } = message;
			const { orderId, reservationId, items, reservedAt } = data;

			logger.info('Orders module processing inventory reserved event', {
				orderId,
				reservationId,
				messageId: message.id
			});

			// Delegate to legacy order module for now
			const legacyOrderSubscriber = require('../../modules/orders/events/subscriber');
			await legacyOrderSubscriber.handleInventoryReserved(message, rawMessage);

		} catch (error) {
			logger.error('Error handling inventory reserved event:', error);
			throw error;
		}
	}

	/**
	 * Handle inventory insufficient event
	 */
	async handleInventoryInsufficient(message, rawMessage) {
		try {
			const { data } = message;
			const { orderId, items, reason } = data;

			logger.info('Orders module processing inventory insufficient event', {
				orderId,
				reason,
				messageId: message.id
			});

			// Delegate to legacy order module for now
			const legacyOrderSubscriber = require('../../modules/orders/events/subscriber');
			await legacyOrderSubscriber.handleInventoryInsufficient(message, rawMessage);

		} catch (error) {
			logger.error('Error handling inventory insufficient event:', error);
			throw error;
		}
	}

	/**
	 * Initialize the subscriber
	 */
	async initialize() {
		logger.info('Order Event Subscriber initialized');
		// Delegate initialization to legacy module if needed
		const legacyOrderSubscriber = require('../../modules/orders/events/subscriber');
		if (legacyOrderSubscriber.initialize) {
			await legacyOrderSubscriber.initialize();
		}
	}

	/**
	 * Get event handlers mapping
	 */
	getEventHandlers() {
		return {
			[EVENTS.PAYMENT_SUCCEEDED]: this.handlePaymentProcessed.bind(this),
			[EVENTS.PAYMENT_FAILED]: this.handlePaymentFailed.bind(this),
			[EVENTS.INVENTORY_RESERVED]: this.handleInventoryReserved.bind(this),
			[EVENTS.INVENTORY_INSUFFICIENT]: this.handleInventoryInsufficient.bind(this)
		};
	}
}

module.exports = new OrderEventSubscriber();
