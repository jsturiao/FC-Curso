const Product = require('./model');
const logger = require('../../shared/utils/logger');

class InventoryService {

  // Get all products with filters
  async getProducts(filters = {}) {
    try {
      const query = { isActive: true };

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.lowStock) {
        // Find products where available stock <= minStock
        query.$expr = { $lte: [{ $subtract: ['$stock', '$reserved'] }, '$minStock'] };
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { sku: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const products = await Product.find(query).sort({ name: 1 });

      logger.info(`Retrieved ${products.length} products`, {
        filters,
        module: 'inventory'
      });

      return products;
    } catch (error) {
      logger.error('Error getting products:', error);
      throw error;
    }
  }

  // Get product by ID
  async getProductById(productId) {
    try {
      const product = await Product.findOne({
        id: productId,
        isActive: true
      });

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      logger.info(`Retrieved product: ${product.name}`, {
        productId,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error getting product by ID:', error);
      throw error;
    }
  }

  // Create new product
  async createProduct(productData) {
    try {
      const product = new Product({
        id: productData.id || `prod_${Date.now()}`,
        name: productData.name,
        description: productData.description || '',
        price: productData.price,
        stock: productData.stock || 0,
        category: productData.category || 'general',
        sku: productData.sku,
        minStock: productData.minStock || 5
      });

      await product.save();

      logger.info(`Product created: ${product.name}`, {
        productId: product.id,
        stock: product.stock,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(productId, updateData) {
    try {
      const product = await this.getProductById(productId);

      // Update allowed fields
      const allowedFields = ['name', 'description', 'price', 'category', 'sku', 'minStock'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          product[field] = updateData[field];
        }
      });

      await product.save();

      logger.info(`Product updated: ${product.name}`, {
        productId,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  // Add stock to product
  async addStock(productId, quantity, reason = 'manual_adjustment') {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      const product = await this.getProductById(productId);
      await product.addStock(quantity);

      logger.info(`Stock added: ${quantity} units to ${product.name}`, {
        productId,
        quantity,
        newStock: product.stock,
        reason,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error adding stock:', error);
      throw error;
    }
  }

  // Reserve stock for order
  async reserveStock(productId, quantity, orderId) {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      const product = await this.getProductById(productId);

      if (product.available < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.available}, Requested: ${quantity}`);
      }

      await product.reserveStock(quantity);

      logger.info(`Stock reserved: ${quantity} units of ${product.name}`, {
        productId,
        quantity,
        orderId,
        remainingAvailable: product.available,
        module: 'inventory'
      });

      return {
        success: true,
        product,
        reserved: quantity,
        available: product.available
      };
    } catch (error) {
      logger.error('Error reserving stock:', error);
      throw error;
    }
  }

  // Release reserved stock
  async releaseReservation(productId, quantity, orderId, reason = 'order_cancelled') {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      const product = await this.getProductById(productId);
      await product.releaseReservation(quantity);

      logger.info(`Reservation released: ${quantity} units of ${product.name}`, {
        productId,
        quantity,
        orderId,
        reason,
        newAvailable: product.available,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error releasing reservation:', error);
      throw error;
    }
  }

  // Confirm stock usage (complete the sale)
  async confirmStockUsage(productId, quantity, orderId) {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      const product = await this.getProductById(productId);
      await product.confirmStockUsage(quantity);

      logger.info(`Stock usage confirmed: ${quantity} units of ${product.name}`, {
        productId,
        quantity,
        orderId,
        finalStock: product.stock,
        module: 'inventory'
      });

      return product;
    } catch (error) {
      logger.error('Error confirming stock usage:', error);
      throw error;
    }
  }

  // Check stock availability for multiple products
  async checkAvailability(items) {
    try {
      const results = [];

      for (const item of items) {
        try {
          const product = await this.getProductById(item.productId);
          const isAvailable = product.available >= item.quantity;

          results.push({
            productId: item.productId,
            productName: product.name,
            requestedQuantity: item.quantity,
            availableQuantity: product.available,
            isAvailable,
            totalStock: product.stock,
            reserved: product.reserved
          });
        } catch (error) {
          results.push({
            productId: item.productId,
            productName: 'Unknown',
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            isAvailable: false,
            error: error.message
          });
        }
      }

      const allAvailable = results.every(result => result.isAvailable);

      logger.info(`Stock availability check completed`, {
        itemsChecked: items.length,
        allAvailable,
        module: 'inventory'
      });

      return {
        allAvailable,
        items: results
      };
    } catch (error) {
      logger.error('Error checking stock availability:', error);
      throw error;
    }
  }

  // Get low stock products
  async getLowStockProducts() {
    try {
      const products = await Product.find({
        isActive: true,
        $expr: { $lte: [{ $subtract: ['$stock', '$reserved'] }, '$minStock'] }
      }).sort({ name: 1 });

      logger.info(`Found ${products.length} products with low stock`, {
        module: 'inventory'
      });

      return products;
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

  // Get inventory statistics
  async getInventoryStats() {
    try {
      const totalProducts = await Product.countDocuments({ isActive: true });
      const lowStockProducts = await this.getLowStockProducts();
      const outOfStockProducts = await Product.countDocuments({
        isActive: true,
        $expr: { $lte: [{ $subtract: ['$stock', '$reserved'] }, 0] }
      });

      const totalValue = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: { $multiply: ['$stock', '$price'] }
            }
          }
        }
      ]);

      const stats = {
        totalProducts,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts,
        totalInventoryValue: totalValue[0]?.totalValue || 0,
        lowStockProducts: lowStockProducts.slice(0, 10) // Top 10 low stock
      };

      logger.info('Inventory statistics generated', {
        ...stats,
        module: 'inventory'
      });

      return stats;
    } catch (error) {
      logger.error('Error getting inventory stats:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
