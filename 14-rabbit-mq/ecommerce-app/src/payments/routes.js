const express = require('express');
const PaymentController = require('./controller');

const router = express.Router();

/**
 * @route POST /api/payments
 * @description Criar novo pagamento
 * @body {
 *   orderId: string,
 *   amount: number,
 *   currency?: string,
 *   paymentMethod: string,
 *   gatewayProvider?: string,
 *   customerInfo: {
 *     customerId: string,
 *     email: string,
 *     name: string
 *   },
 *   paymentDetails?: object,
 *   metadata?: object
 * }
 */
router.post('/', PaymentController.createPayment);

/**
 * @route GET /api/payments
 * @description Listar pagamentos com filtros
 * @query {
 *   status?: string,
 *   orderId?: string,
 *   customerId?: string,
 *   paymentMethod?: string,
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/', PaymentController.listPayments);

/**
 * @route GET /api/payments/stats
 * @description Obter estatísticas de pagamentos
 */
router.get('/stats', PaymentController.getPaymentStats);

/**
 * @route GET /api/payments/:paymentId
 * @description Obter pagamento por ID
 * @param {string} paymentId - ID único do pagamento
 */
router.get('/:paymentId', PaymentController.getPayment);

/**
 * @route POST /api/payments/:paymentId/process
 * @description Processar pagamento
 * @param {string} paymentId - ID único do pagamento
 * @body {
 *   gatewayData?: object
 * }
 */
router.post('/:paymentId/process', PaymentController.processPayment);

/**
 * @route POST /api/payments/:paymentId/cancel
 * @description Cancelar pagamento
 * @param {string} paymentId - ID único do pagamento
 * @body {
 *   reason?: string
 * }
 */
router.post('/:paymentId/cancel', PaymentController.cancelPayment);

/**
 * @route POST /api/payments/:paymentId/refund
 * @description Processar reembolso
 * @param {string} paymentId - ID único do pagamento
 * @body {
 *   amount?: number,
 *   reason: string
 * }
 */
router.post('/:paymentId/refund', PaymentController.refundPayment);

module.exports = router;
