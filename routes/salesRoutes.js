const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { auth } = require('../middleware/auth');
// Apply auth middleware to all routes
router.use(authenticateToken);

// Create a new sale
router.post('/', auth, salesController.createSale);

// Get all sales
router.get('/', auth, salesController.getSales);

// Get sales summary
router.get('/summary', auth, salesController.getSalesSummary);

// Get sale details
router.get('/:id', auth, salesController.getSaleDetails);

// Update sale status
router.patch('/:id/status', auth, salesController.updateSaleStatus);

// Lock a sale
router.patch('/:id/lock', auth, salesController.lockSale);

// Request to void a sale
router.post('/:id/void', auth, salesController.requestVoid);

module.exports = router; 
