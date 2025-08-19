const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PaymentSchema = new mongoose.Schema({
	paymentId: {
		type: String,
		default: uuidv4,
		unique: true,
		required: true
	},
	orderId: {
		type: String,
		required: true,
		index: true
	},
	amount: {
		type: Number,
		required: true,
		min: 0.01
	},
	currency: {
		type: String,
		default: 'BRL',
		enum: ['BRL', 'USD', 'EUR']
	},
	paymentMethod: {
		type: String,
		required: true,
		enum: ['credit_card', 'debit_card', 'pix', 'boleto', 'paypal']
	},
	status: {
		type: String,
		default: 'pending',
		enum: ['pending', 'processing', 'approved', 'declined', 'cancelled', 'refunded']
	},
	gatewayProvider: {
		type: String,
		required: true,
		enum: ['stripe', 'mercadopago', 'pagseguro', 'mock']
	},
	gatewayTransactionId: {
		type: String,
		sparse: true
	},
	gatewayResponse: {
		type: mongoose.Schema.Types.Mixed,
		default: {}
	},
	customerInfo: {
		customerId: { type: String, required: true },
		email: { type: String, required: true },
		name: { type: String, required: true }
	},
	paymentDetails: {
		cardLast4: String,
		cardBrand: String,
		installments: { type: Number, default: 1 },
		authorizationCode: String
	},
	timeline: [{
		status: String,
		timestamp: { type: Date, default: Date.now },
		message: String,
		metadata: mongoose.Schema.Types.Mixed
	}],
	attempts: {
		type: Number,
		default: 0
	},
	maxAttempts: {
		type: Number,
		default: 3
	},
	fees: {
		gateway: { type: Number, default: 0 },
		platform: { type: Number, default: 0 },
		total: { type: Number, default: 0 }
	},
	refunds: [{
		refundId: String,
		amount: Number,
		reason: String,
		status: String,
		processedAt: Date,
		gatewayRefundId: String
	}],
	metadata: {
		type: mongoose.Schema.Types.Mixed,
		default: {}
	}
}, {
	timestamps: true,
	collection: 'payments'
});

// Indexes
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ gatewayProvider: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ 'customerInfo.customerId': 1 });

// Virtual para valor líquido (após taxas)
PaymentSchema.virtual('netAmount').get(function () {
	return this.amount - this.fees.total;
});

// Virtual para verificar se pode tentar novamente
PaymentSchema.virtual('canRetry').get(function () {
	return this.attempts < this.maxAttempts &&
		['declined', 'cancelled'].includes(this.status);
});

// Método para adicionar evento na timeline
PaymentSchema.methods.addTimelineEvent = function (status, message, metadata = {}) {
	this.timeline.push({
		status,
		message,
		metadata,
		timestamp: new Date()
	});
};

// Método para processar pagamento
PaymentSchema.methods.process = async function () {
	this.status = 'processing';
	this.attempts += 1;
	this.addTimelineEvent('processing', 'Payment processing started');
	return this.save();
};

// Método para aprovar pagamento
PaymentSchema.methods.approve = async function (gatewayResponse = {}) {
	this.status = 'approved';
	this.gatewayResponse = gatewayResponse;
	this.gatewayTransactionId = gatewayResponse.transactionId || uuidv4();
	this.addTimelineEvent('approved', 'Payment approved successfully', gatewayResponse);
	return this.save();
};

// Método para recusar pagamento
PaymentSchema.methods.decline = async function (reason, gatewayResponse = {}) {
	this.status = 'declined';
	this.gatewayResponse = gatewayResponse;
	this.addTimelineEvent('declined', reason || 'Payment declined', gatewayResponse);
	return this.save();
};

// Método para cancelar pagamento
PaymentSchema.methods.cancel = async function (reason) {
	this.status = 'cancelled';
	this.addTimelineEvent('cancelled', reason || 'Payment cancelled');
	return this.save();
};

// Método para processar reembolso
PaymentSchema.methods.refund = async function (amount, reason) {
	const refundAmount = amount || this.amount;
	const refund = {
		refundId: uuidv4(),
		amount: refundAmount,
		reason,
		status: 'pending',
		processedAt: new Date()
	};

	this.refunds.push(refund);

	// Se reembolso total, mudar status
	const totalRefunded = this.refunds.reduce((sum, r) => sum + r.amount, 0);
	if (totalRefunded >= this.amount) {
		this.status = 'refunded';
		this.addTimelineEvent('refunded', `Full refund processed: ${reason}`);
	} else {
		this.addTimelineEvent('partial_refund', `Partial refund processed: ${reason}`, { amount: refundAmount });
	}

	return this.save();
};

// Statics para consultas
PaymentSchema.statics.findByOrderId = function (orderId) {
	return this.findOne({ orderId });
};

PaymentSchema.statics.findByCustomer = function (customerId) {
	return this.find({ 'customerInfo.customerId': customerId });
};

PaymentSchema.statics.findPendingPayments = function () {
	return this.find({ status: 'pending' });
};

PaymentSchema.statics.findByStatus = function (status) {
	return this.find({ status });
};

PaymentSchema.statics.getPaymentStats = function () {
	return this.aggregate([
		{
			$group: {
				_id: '$status',
				count: { $sum: 1 },
				totalAmount: { $sum: '$amount' }
			}
		}
	]);
};

// Middleware pre-save
PaymentSchema.pre('save', function (next) {
	// Calcular taxa total se não definida
	if (this.fees.gateway || this.fees.platform) {
		this.fees.total = (this.fees.gateway || 0) + (this.fees.platform || 0);
	}

	// Adicionar evento inicial se for novo documento
	if (this.isNew) {
		this.addTimelineEvent('created', 'Payment created');
	}

	next();
});

// Middleware post-save
PaymentSchema.post('save', function (doc) {
	// Emitir evento quando status mudar (será implementado no EventBus)
	if (this.isModified('status')) {
		const EventBus = require('../shared/events/EventBus');
		EventBus.publish('payment.status.changed', {
			paymentId: doc.paymentId,
			orderId: doc.orderId,
			status: doc.status,
			amount: doc.amount,
			timestamp: new Date()
		});
	}
});

module.exports = mongoose.model('Payment', PaymentSchema);
