const express = require('express');
const router = express.Router();
const inventoryController = require('./controller');

// Product management routes
router.get('/products', inventoryController.getProducts);
router.get('/products/:id', inventoryController.getProduct);
router.post('/products', inventoryController.createProduct);
router.put('/products/:id', inventoryController.updateProduct);

// Stock management routes
router.post('/products/:id/add-stock', inventoryController.addStock);
router.post('/products/:id/reserve', inventoryController.reserveStock);
router.post('/products/:id/release', inventoryController.releaseReservation);
router.post('/products/:id/confirm', inventoryController.confirmStockUsage);

// Inventory operations routes
router.post('/inventory/check-availability', inventoryController.checkAvailability);
router.get('/inventory/low-stock', inventoryController.getLowStockProducts);
router.get('/inventory/stats', inventoryController.getInventoryStats);

// Additional routes for testing compatibility
router.get('/stats', inventoryController.getInventoryStats); // Alias for inventory/stats
router.post('/stock/add', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Stock management functionality will be implemented in next stages',
    feature: 'stock-add',
    status: 'not-implemented'
  });
});

router.post('/stock/reserve', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Stock reservation functionality will be implemented in next stages',
    feature: 'stock-reserve',
    status: 'not-implemented'
  });
});

module.exports = router;
