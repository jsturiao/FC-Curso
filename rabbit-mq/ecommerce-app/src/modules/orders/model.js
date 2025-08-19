const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'PENDING',           // Order created, waiting for processing
      'INVENTORY_RESERVED', // Inventory has been reserved
      'PAYMENT_PROCESSING', // Payment is being processed
      'PAYMENT_CONFIRMED',  // Payment successful
      'PAYMENT_FAILED',     // Payment failed
      'CONFIRMED',          // Order confirmed and ready for fulfillment
      'SHIPPED',            // Order has been shipped
      'DELIVERED',          // Order delivered to customer
      'CANCELLED',          // Order cancelled
      'REFUNDED'            // Order refunded
    ],
    default: 'PENDING',
    index: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'US' }
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'US' }
  },
  paymentInfo: {
    paymentId: String,
    paymentMethod: String,
    transactionId: String,
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    }
  },
  inventoryInfo: {
    reservationId: String,
    reservedAt: Date,
    isReserved: { type: Boolean, default: false }
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    message: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    source: { type: String, default: 'web' }, // web, mobile, api
    correlationId: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'orders'
});

// Indexes for better performance
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'metadata.correlationId': 1 });
orderSchema.index({ 'paymentInfo.paymentId': 1 });
orderSchema.index({ 'inventoryInfo.reservationId': 1 });

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderId: this.orderId,
    customerId: this.customerId,
    status: this.status,
    total: this.total,
    currency: this.currency,
    itemCount: this.items.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Instance methods
orderSchema.methods.addTimelineEntry = function(status, message, metadata = {}) {
  this.timeline.push({
    status,
    message,
    metadata,
    timestamp: new Date()
  });
};

orderSchema.methods.updateStatus = function(newStatus, message, metadata = {}) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.addTimelineEntry(newStatus, message || `Status changed from ${oldStatus} to ${newStatus}`, metadata);
};

orderSchema.methods.reserveInventory = function(reservationId) {
  this.inventoryInfo.reservationId = reservationId;
  this.inventoryInfo.reservedAt = new Date();
  this.inventoryInfo.isReserved = true;
  this.updateStatus('INVENTORY_RESERVED', 'Inventory reserved successfully', { reservationId });
};

orderSchema.methods.updatePayment = function(paymentInfo) {
  this.paymentInfo = { ...this.paymentInfo, ...paymentInfo };
  
  if (paymentInfo.paymentStatus === 'COMPLETED') {
    this.updateStatus('PAYMENT_CONFIRMED', 'Payment processed successfully', paymentInfo);
  } else if (paymentInfo.paymentStatus === 'FAILED') {
    this.updateStatus('PAYMENT_FAILED', 'Payment processing failed', paymentInfo);
  } else if (paymentInfo.paymentStatus === 'PROCESSING') {
    this.updateStatus('PAYMENT_PROCESSING', 'Payment is being processed', paymentInfo);
  }
};

orderSchema.methods.confirm = function() {
  this.updateStatus('CONFIRMED', 'Order confirmed and ready for fulfillment');
};

orderSchema.methods.cancel = function(reason = 'Cancelled by user') {
  this.updateStatus('CANCELLED', reason);
  // Release inventory if reserved
  if (this.inventoryInfo.isReserved) {
    this.inventoryInfo.isReserved = false;
  }
};

// Static methods
orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const query = { customerId };
  if (status) query.status = status;
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

orderSchema.statics.findByStatus = function(status, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find({ status })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

orderSchema.statics.getOrderStats = function(timeframe = '24h') {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$total' },
        avgValue: { $avg: '$total' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate total (subtotal + tax + shipping)
  this.total = this.subtotal + (this.tax || 0) + (this.shipping || 0);
  
  // Ensure item totals are correct
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.unitPrice;
  });
  
  next();
});

// Post-save middleware for logging
orderSchema.post('save', function(doc) {
  const logger = require('../../shared/utils/logger');
  logger.db('Order saved', 'orders', {
    orderId: doc.orderId,
    status: doc.status,
    total: doc.total
  });
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
