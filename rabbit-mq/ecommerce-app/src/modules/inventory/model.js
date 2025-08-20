const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reserved: {
    type: Number,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    default: 'general'
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  minStock: {
    type: Number,
    default: 5,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual field for available stock
productSchema.virtual('available').get(function() {
  return Math.max(0, this.stock - this.reserved);
});

// Virtual field to check if stock is low
productSchema.virtual('isLowStock').get(function() {
  return this.available <= this.minStock;
});

// Method to reserve stock
productSchema.methods.reserveStock = function(quantity) {
  if (this.available < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.available}, Requested: ${quantity}`);
  }
  
  this.reserved += quantity;
  this.updatedAt = new Date();
  return this.save();
};

// Method to release reserved stock
productSchema.methods.releaseReservation = function(quantity) {
  const releaseAmount = Math.min(quantity, this.reserved);
  this.reserved -= releaseAmount;
  this.updatedAt = new Date();
  return this.save();
};

// Method to confirm stock usage (reduce actual stock)
productSchema.methods.confirmStockUsage = function(quantity) {
  if (this.reserved < quantity) {
    throw new Error(`Insufficient reserved stock. Reserved: ${this.reserved}, Requested: ${quantity}`);
  }
  
  this.stock -= quantity;
  this.reserved -= quantity;
  this.updatedAt = new Date();
  return this.save();
};

// Method to add stock
productSchema.methods.addStock = function(quantity) {
  this.stock += quantity;
  this.updatedAt = new Date();
  return this.save();
};

// Pre-save middleware to update updatedAt
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure virtuals are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
