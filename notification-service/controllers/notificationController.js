const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class NotificationController {
    // Send notification
    async sendNotification(req, res) {
        try {
            const { user_id, order_id, type, data } = req.body;

            if (!user_id || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and notification type are required'
                });
            }

            let result;
            switch (type) {
                case 'order_confirmation':
                    result = await notificationService.sendOrderConfirmation(user_id, data);
                    break;
                case 'order_status_update':
                    result = await notificationService.sendOrderStatusUpdate(user_id, data, data.status);
                    break;
                case 'payment_confirmation':
                    result = await notificationService.sendPaymentConfirmation(user_id, data);
                    break;
                case 'order_cancellation':
                    result = await notificationService.sendOrderCancellation(user_id, data);
                    break;
                case 'welcome':
                    result = await notificationService.sendWelcomeEmail(user_id, data);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid notification type'
                    });
            }

            res.json({
                success: true,
                message: 'Notification sent successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error in sendNotification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notification',
                error: error.message
            });
        }
    }

    // Send email directly
    async sendEmail(req, res) {
        try {
            const { to, subject, html, text } = req.body;

            if (!to || !subject) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient email and subject are required'
                });
            }

            const result = await notificationService.sendEmail(to, subject, html, text);

            res.json({
                success: true,
                message: 'Email sent successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error in sendEmail:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send email',
                error: error.message
            });
        }
    }

    // Send SMS directly
    async sendSMS(req, res) {
        try {
            const { to, message } = req.body;

            if (!to || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient phone number and message are required'
                });
            }

            const result = await notificationService.sendSMS(to, message);

            res.json({
                success: true,
                message: 'SMS sent successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error in sendSMS:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send SMS',
                error: error.message
            });
        }
    }

    // Send push notification
    async sendPushNotification(req, res) {
        try {
            const { userId, title, body, data } = req.body;

            if (!userId || !title || !body) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, title, and body are required'
                });
            }

            const result = await notificationService.sendPushNotification(userId, title, body, data);

            res.json({
                success: true,
                message: 'Push notification sent successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error in sendPushNotification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send push notification',
                error: error.message
            });
        }
    }

    // Get user notifications
    async getUserNotifications(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 20 } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            const notifications = await notificationService.getUserNotifications(userId, parseInt(limit));

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            logger.error('Error in getUserNotifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user notifications',
                error: error.message
            });
        }
    }

    // Mark notification as read
    async markNotificationAsRead(req, res) {
        try {
            const { userId, notificationId } = req.params;

            if (!userId || !notificationId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and notification ID are required'
                });
            }

            await notificationService.markNotificationAsRead(userId, notificationId);

            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            logger.error('Error in markNotificationAsRead:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    }

    // Send order confirmation
    async sendOrderConfirmation(req, res) {
        try {
            const { user_id, order_data } = req.body;

            if (!user_id || !order_data) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and order data are required'
                });
            }

            await notificationService.sendOrderConfirmation(user_id, order_data);

            res.json({
                success: true,
                message: 'Order confirmation notifications sent successfully'
            });
        } catch (error) {
            logger.error('Error in sendOrderConfirmation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send order confirmation',
                error: error.message
            });
        }
    }

    // Send order status update
    async sendOrderStatusUpdate(req, res) {
        try {
            const { user_id, order_data, status } = req.body;

            if (!user_id || !order_data || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, order data, and status are required'
                });
            }

            await notificationService.sendOrderStatusUpdate(user_id, order_data, status);

            res.json({
                success: true,
                message: 'Order status update notifications sent successfully'
            });
        } catch (error) {
            logger.error('Error in sendOrderStatusUpdate:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send order status update',
                error: error.message
            });
        }
    }

    // Send payment confirmation
    async sendPaymentConfirmation(req, res) {
        try {
            const { user_id, order_data } = req.body;

            if (!user_id || !order_data) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and order data are required'
                });
            }

            await notificationService.sendPaymentConfirmation(user_id, order_data);

            res.json({
                success: true,
                message: 'Payment confirmation notifications sent successfully'
            });
        } catch (error) {
            logger.error('Error in sendPaymentConfirmation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send payment confirmation',
                error: error.message
            });
        }
    }

    // Send order cancellation
    async sendOrderCancellation(req, res) {
        try {
            const { user_id, order_data } = req.body;

            if (!user_id || !order_data) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and order data are required'
                });
            }

            await notificationService.sendOrderCancellation(user_id, order_data);

            res.json({
                success: true,
                message: 'Order cancellation notifications sent successfully'
            });
        } catch (error) {
            logger.error('Error in sendOrderCancellation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send order cancellation',
                error: error.message
            });
        }
    }

    // Send welcome email
    async sendWelcomeEmail(req, res) {
        try {
            const { user_id, user_data } = req.body;

            if (!user_id || !user_data) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and user data are required'
                });
            }

            await notificationService.sendWelcomeEmail(user_id, user_data);

            res.json({
                success: true,
                message: 'Welcome notifications sent successfully'
            });
        } catch (error) {
            logger.error('Error in sendWelcomeEmail:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send welcome email',
                error: error.message
            });
        }
    }

    // Health check
    async healthCheck(req, res) {
        res.json({
            success: true,
            message: 'Notification Service is running',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new NotificationController(); 