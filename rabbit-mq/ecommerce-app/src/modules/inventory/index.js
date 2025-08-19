const inventoryService = require('../../../inventory/service');
const inventoryEventSubscriber = require('../../../inventory/events/subscriber');
const inventoryRoutes = require('../../../inventory/routes');
const logger = require(require('path').join(__dirname, '../../shared/utils/logger'));

class InventoryModule {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Inventory Module...', { module: 'inventory' });

      // Initialize event subscribers
      await inventoryEventSubscriber.initialize();

      // Create some sample products if the database is empty
      await this.createSampleProducts();

      this.isInitialized = true;
      logger.info('✅ Inventory Module initialized successfully', { module: 'inventory' });

      return {
        routes: inventoryRoutes,
        basePath: '/api'
      };
    } catch (error) {
      logger.error('Error initializing Inventory Module:', error);
      throw error;
    }
  }

  async createSampleProducts() {
    try {
      const existingProducts = await inventoryService.getProducts();

      if (existingProducts.length === 0) {
        logger.info('Creating sample products...', { module: 'inventory' });

        const sampleProducts = [
          {
            id: 'prod_laptop_001',
            name: 'Gaming Laptop Pro',
            description: 'High-performance gaming laptop with RTX graphics',
            price: 1299.99,
            stock: 25,
            category: 'electronics',
            sku: 'LAP-GAM-001',
            minStock: 5
          },
          {
            id: 'prod_phone_001',
            name: 'Smartphone X',
            description: 'Latest flagship smartphone with advanced camera',
            price: 899.99,
            stock: 50,
            category: 'electronics',
            sku: 'PHN-FLG-001',
            minStock: 10
          },
          {
            id: 'prod_headphones_001',
            name: 'Wireless Headphones Pro',
            description: 'Premium noise-cancelling wireless headphones',
            price: 199.99,
            stock: 30,
            category: 'electronics',
            sku: 'HDP-WRL-001',
            minStock: 8
          },
          {
            id: 'prod_tablet_001',
            name: 'Tablet Air',
            description: 'Lightweight tablet for productivity and entertainment',
            price: 549.99,
            stock: 20,
            category: 'electronics',
            sku: 'TAB-AIR-001',
            minStock: 5
          },
          {
            id: 'prod_watch_001',
            name: 'Smart Watch Sport',
            description: 'Fitness tracking smartwatch with GPS',
            price: 299.99,
            stock: 15,
            category: 'electronics',
            sku: 'WTC-SPT-001',
            minStock: 3
          },
          {
            id: 'prod_keyboard_001',
            name: 'Mechanical Keyboard RGB',
            description: 'Gaming mechanical keyboard with RGB lighting',
            price: 129.99,
            stock: 40,
            category: 'electronics',
            sku: 'KBD-MCH-001',
            minStock: 10
          },
          {
            id: 'prod_mouse_001',
            name: 'Gaming Mouse Pro',
            description: 'High-precision gaming mouse with customizable buttons',
            price: 79.99,
            stock: 35,
            category: 'electronics',
            sku: 'MSE-GAM-001',
            minStock: 8
          },
          {
            id: 'prod_monitor_001',
            name: '4K Monitor Ultra',
            description: '27-inch 4K monitor for professional work',
            price: 399.99,
            stock: 12,
            category: 'electronics',
            sku: 'MON-4K-001',
            minStock: 3
          },
          {
            id: 'prod_camera_001',
            name: 'Digital Camera Pro',
            description: 'Professional DSLR camera with lens kit',
            price: 799.99,
            stock: 8,
            category: 'electronics',
            sku: 'CAM-DSL-001',
            minStock: 2
          },
          {
            id: 'prod_speaker_001',
            name: 'Bluetooth Speaker Max',
            description: 'Portable Bluetooth speaker with powerful bass',
            price: 89.99,
            stock: 60,
            category: 'electronics',
            sku: 'SPK-BLU-001',
            minStock: 15
          }
        ];

        for (const productData of sampleProducts) {
          try {
            await inventoryService.createProduct(productData);
            logger.info(`Sample product created: ${productData.name}`, {
              productId: productData.id,
              module: 'inventory'
            });
          } catch (error) {
            logger.error(`Failed to create sample product: ${productData.name}`, error);
          }
        }

        logger.info(`✅ Created ${sampleProducts.length} sample products`, { module: 'inventory' });
      } else {
        logger.info(`Found ${existingProducts.length} existing products, skipping sample creation`, {
          module: 'inventory'
        });
      }
    } catch (error) {
      logger.error('Error creating sample products:', error);
    }
  }

  getStatus() {
    return {
      module: 'inventory',
      initialized: this.isInitialized,
      timestamp: new Date().toISOString()
    };
  }

  async getHealthCheck() {
    try {
      const stats = await inventoryService.getInventoryStats();
      const lowStockProducts = await inventoryService.getLowStockProducts();

      return {
        module: 'inventory',
        status: 'healthy',
        initialized: this.isInitialized,
        statistics: {
          totalProducts: stats.totalProducts,
          lowStockCount: stats.lowStockCount,
          outOfStockCount: stats.outOfStockCount,
          totalInventoryValue: stats.totalInventoryValue
        },
        alerts: {
          lowStockProducts: lowStockProducts.length,
          criticalProducts: lowStockProducts.filter(p => p.available <= 0).length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        module: 'inventory',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get routes
   */
  get routes() {
    return inventoryRoutes;
  }
}

module.exports = new InventoryModule();
