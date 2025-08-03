const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const rateLimit = require('express-rate-limit');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all routes
router.use(limiter);

// Health check
router.get('/health', notificationController.healthCheck);

// Send notifications
router.post('/send', notificationController.sendNotification);

// Send specific notification types
router.post('/send/order-confirmation', notificationController.sendOrderConfirmation);
router.post('/send/order-status-update', notificationController.sendOrderStatusUpdate);
router.post('/send/payment-confirmation', notificationController.sendPaymentConfirmation);
router.post('/send/order-cancellation', notificationController.sendOrderCancellation);
router.post('/send/welcome', notificationController.sendWelcomeEmail);

// Direct notification methods
router.post('/email', notificationController.sendEmail);
router.post('/sms', notificationController.sendSMS);
router.post('/push', notificationController.sendPushNotification);

// User notification management
router.get('/user/:userId', notificationController.getUserNotifications);
router.patch('/user/:userId/:notificationId/read', notificationController.markNotificationAsRead);

module.exports = router; 