const inventoryService = require('./service');
const logger = require('../src/shared/utils/logger');

class InventoryController {

  // GET /api/products - Get all products with optional filters
  async getProducts(req, res) {
    try {
      const filters = {
        category: req.query.category,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const products = await inventoryService.getProducts(filters);

      res.json({
        success: true,
        data: products,
        count: products.length,
        filters: filters
      });
    } catch (error) {
      logger.error('Error in getProducts controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/products/:id - Get product by ID
  async getProduct(req, res) {
    try {
      const product = await inventoryService.getProductById(req.params.id);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Error in getProduct controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/products - Create new product
  async createProduct(req, res) {
    try {
      const productData = {
        id: req.body.id,
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        stock: parseInt(req.body.stock) || 0,
        category: req.body.category,
        sku: req.body.sku,
        minStock: parseInt(req.body.minStock) || 5
      };

      // Validation
      if (!productData.name || !productData.price) {
        return res.status(400).json({
          success: false,
          error: 'Name and price are required'
        });
      }

      if (productData.price < 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be positive'
        });
      }

      const product = await inventoryService.createProduct(productData);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      logger.error('Error in createProduct controller:', error);

      if (error.code === 11000) {
        res.status(409).json({
          success: false,
          error: 'Product ID or SKU already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // PUT /api/products/:id - Update product
  async updateProduct(req, res) {
    try {
      const updateData = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        category: req.body.category,
        sku: req.body.sku,
        minStock: req.body.minStock ? parseInt(req.body.minStock) : undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      if (updateData.price !== undefined && updateData.price < 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be positive'
        });
      }

      const product = await inventoryService.updateProduct(req.params.id, updateData);

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateProduct controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/products/:id/add-stock - Add stock to product
  async addStock(req, res) {
    try {
      const quantity = parseInt(req.body.quantity);
      const reason = req.body.reason || 'manual_adjustment';

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      const product = await inventoryService.addStock(req.params.id, quantity, reason);

      res.json({
        success: true,
        data: product,
        message: `Added ${quantity} units to stock`
      });
    } catch (error) {
      logger.error('Error in addStock controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/products/:id/reserve - Reserve stock for order
  async reserveStock(req, res) {
    try {
      const quantity = parseInt(req.body.quantity);
      const orderId = req.body.orderId;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID is required'
        });
      }

      const result = await inventoryService.reserveStock(req.params.id, quantity, orderId);

      res.json({
        success: true,
        data: result,
        message: `Reserved ${quantity} units`
      });
    } catch (error) {
      logger.error('Error in reserveStock controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('Insufficient stock')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/products/:id/release - Release reserved stock
  async releaseReservation(req, res) {
    try {
      const quantity = parseInt(req.body.quantity);
      const orderId = req.body.orderId;
      const reason = req.body.reason || 'order_cancelled';

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      const product = await inventoryService.releaseReservation(req.params.id, quantity, orderId, reason);

      res.json({
        success: true,
        data: product,
        message: `Released ${quantity} units from reservation`
      });
    } catch (error) {
      logger.error('Error in releaseReservation controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/products/:id/confirm - Confirm stock usage
  async confirmStockUsage(req, res) {
    try {
      const quantity = parseInt(req.body.quantity);
      const orderId = req.body.orderId;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID is required'
        });
      }

      const product = await inventoryService.confirmStockUsage(req.params.id, quantity, orderId);

      res.json({
        success: true,
        data: product,
        message: `Confirmed usage of ${quantity} units`
      });
    } catch (error) {
      logger.error('Error in confirmStockUsage controller:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('Insufficient reserved stock')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // POST /api/inventory/check-availability - Check stock availability for multiple items
  async checkAvailability(req, res) {
    try {
      const items = req.body.items;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Items array is required'
        });
      }

      // Validate items format
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have productId and positive quantity'
          });
        }
      }

      const result = await inventoryService.checkAvailability(items);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in checkAvailability controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/inventory/low-stock - Get products with low stock
  async getLowStockProducts(req, res) {
    try {
      const products = await inventoryService.getLowStockProducts();

      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      logger.error('Error in getLowStockProducts controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/inventory/stats - Get inventory statistics
  async getInventoryStats(req, res) {
    try {
      const stats = await inventoryService.getInventoryStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getInventoryStats controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new InventoryController();
