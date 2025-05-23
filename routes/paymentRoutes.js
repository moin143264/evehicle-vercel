const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Create payment intent
router.post('/create-payment-intent', 
  authenticateToken, 
  paymentController.createPaymentIntent
);

// Confirm payment
router.post('/confirm-payment', 
  authenticateToken, 
  paymentController.confirmPayment
);

// Get payment history
router.get('/history', 
  authenticateToken, 
  paymentController.getPaymentHistory
);

// Cancel booking
router.post('/:paymentId/cancel', 
  authenticateToken, 
  paymentController.cancelBooking
);
router.get('/',authenticateToken,paymentController.getAllBookings);
module.exports = router;