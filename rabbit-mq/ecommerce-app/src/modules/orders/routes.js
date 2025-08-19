const express = require('express');
const orderController = require('./controller');
const logger = require('../../shared/utils/logger');

const router = express.Router();

// Middleware for logging requests
router.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Get all orders (with pagination)
router.get('/', async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', sortOrder = 'desc', limit = 20, skip = 0 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const Order = require('./model');
    const orders = await Order.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .exec();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + orders.length) < total
      }
    });

  } catch (error) {
    logger.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
      details: error.message
    });
  }
});

// Create new order
router.post('/', orderController.createOrder);

// Get order statistics (must come before /:orderId to avoid conflict)
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      matchFilter.createdAt = dateFilter;
    }

    const Order = require('./model');
    const stats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          statusCounts: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          statusCounts: {
            $reduce: {
              input: '$statusCounts',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [[{
                      k: '$$this',
                      v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                    }]]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {}
      }
    });

  } catch (error) {
    logger.error('Error getting order statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order statistics',
      details: error.message
    });
  }
});

// Get order by ID
router.get('/:orderId', orderController.getOrder);

// Update order
router.patch('/:orderId', orderController.updateOrder);

// Cancel order
router.delete('/:orderId', orderController.cancelOrder);

// Get orders by customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status, sortBy = 'createdAt', sortOrder = 'desc', limit = 20, skip = 0 } = req.query;

    // Build query
    const query = { customerId };
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const Order = require('./model');
    const orders = await Order.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .exec();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + parseInt(limit)) < total
        }
      }
    });

  } catch (error) {
    logger.error('Error getting customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer orders',
      details: error.message
    });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      matchFilter.createdAt = dateFilter;
    }

    const Order = require('./model');
    const stats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['CONFIRMED', 'DELIVERED']] },
                '$total',
                0
              ]
            }
          },
          averageOrderValue: { $avg: '$total' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          totalOrders: 1,
          totalRevenue: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          statusCounts: {
            $reduce: {
              input: '$statusBreakdown',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{
                        k: '$$this',
                        v: {
                          $add: [
                            { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                            1
                          ]
                        }
                      }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {}
      }
    });

  } catch (error) {
    logger.error('Error getting order statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order statistics',
      details: error.message
    });
  }
});

module.exports = router;
