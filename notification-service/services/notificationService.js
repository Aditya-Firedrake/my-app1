const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Queue = require('bull');
const redis = require('redis');
const logger = require('../utils/logger');

class NotificationService {
    constructor() {
        this.redisClient = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        this.redisClient.on('error', (err) => {
            logger.error('Redis Client Error:', err);
        });

        this.redisClient.connect();

        // Initialize email transporter
        this.emailTransporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Initialize Twilio client for SMS
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        // Initialize Bull queue for background processing
        this.notificationQueue = new Queue('notifications', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379
            }
        });

        this.setupQueueHandlers();
    }

    setupQueueHandlers() {
        // Process email notifications
        this.notificationQueue.process('email', async (job) => {
            try {
                const { to, subject, html, text } = job.data;
                await this.sendEmail(to, subject, html, text);
                logger.info(`Email sent successfully to ${to}`);
            } catch (error) {
                logger.error('Email queue processing error:', error);
                throw error;
            }
        });

        // Process SMS notifications
        this.notificationQueue.process('sms', async (job) => {
            try {
                const { to, message } = job.data;
                await this.sendSMS(to, message);
                logger.info(`SMS sent successfully to ${to}`);
            } catch (error) {
                logger.error('SMS queue processing error:', error);
                throw error;
            }
        });

        // Process push notifications
        this.notificationQueue.process('push', async (job) => {
            try {
                const { userId, title, body, data } = job.data;
                await this.sendPushNotification(userId, title, body, data);
                logger.info(`Push notification sent successfully to user ${userId}`);
            } catch (error) {
                logger.error('Push notification queue processing error:', error);
                throw error;
            }
        });
    }

    async sendEmail(to, subject, html, text) {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: to,
                subject: subject,
                html: html,
                text: text
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            logger.info(`Email sent: ${result.messageId}`);
            return result;
        } catch (error) {
            logger.error('Email sending error:', error);
            throw error;
        }
    }

    async sendSMS(to, message) {
        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to
            });

            logger.info(`SMS sent: ${result.sid}`);
            return result;
        } catch (error) {
            logger.error('SMS sending error:', error);
            throw error;
        }
    }

    async sendPushNotification(userId, title, body, data = {}) {
        try {
            // Mock push notification - in real app, this would integrate with FCM, APNS, etc.
            logger.info(`Push notification to user ${userId}: ${title} - ${body}`);
            
            // Store notification in Redis for user's notification history
            const notification = {
                id: Date.now().toString(),
                userId: userId,
                title: title,
                body: body,
                data: data,
                timestamp: new Date().toISOString(),
                read: false
            };

            await this.redisClient.lPush(`notifications:${userId}`, JSON.stringify(notification));
            await this.redisClient.lTrim(`notifications:${userId}`, 0, 99); // Keep last 100 notifications

            return notification;
        } catch (error) {
            logger.error('Push notification error:', error);
            throw error;
        }
    }

    async sendOrderConfirmation(userId, orderData) {
        try {
            const emailTemplate = this.getOrderConfirmationEmailTemplate(orderData);
            const smsTemplate = this.getOrderConfirmationSMSTemplate(orderData);

            // Add to queue for background processing
            await this.notificationQueue.add('email', {
                to: orderData.shipping_email,
                subject: 'Order Confirmation - Your Order Has Been Placed',
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            if (orderData.shipping_phone) {
                await this.notificationQueue.add('sms', {
                    to: orderData.shipping_phone,
                    message: smsTemplate
                });
            }

            // Send push notification
            await this.notificationQueue.add('push', {
                userId: userId,
                title: 'Order Confirmed!',
                body: `Your order #${orderData.order_number} has been placed successfully.`,
                data: { orderId: orderData.id, orderNumber: orderData.order_number }
            });

            logger.info(`Order confirmation notifications queued for user ${userId}`);
        } catch (error) {
            logger.error('Order confirmation notification error:', error);
            throw error;
        }
    }

    async sendOrderStatusUpdate(userId, orderData, status) {
        try {
            const emailTemplate = this.getOrderStatusEmailTemplate(orderData, status);
            const smsTemplate = this.getOrderStatusSMSTemplate(orderData, status);

            await this.notificationQueue.add('email', {
                to: orderData.shipping_email,
                subject: `Order Update - ${status.toUpperCase()}`,
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            if (orderData.shipping_phone) {
                await this.notificationQueue.add('sms', {
                    to: orderData.shipping_phone,
                    message: smsTemplate
                });
            }

            await this.notificationQueue.add('push', {
                userId: userId,
                title: 'Order Status Updated',
                body: `Your order #${orderData.order_number} is now ${status}.`,
                data: { orderId: orderData.id, orderNumber: orderData.order_number, status: status }
            });

            logger.info(`Order status update notifications queued for user ${userId}`);
        } catch (error) {
            logger.error('Order status update notification error:', error);
            throw error;
        }
    }

    async sendPaymentConfirmation(userId, orderData) {
        try {
            const emailTemplate = this.getPaymentConfirmationEmailTemplate(orderData);
            const smsTemplate = this.getPaymentConfirmationSMSTemplate(orderData);

            await this.notificationQueue.add('email', {
                to: orderData.shipping_email,
                subject: 'Payment Confirmed - Thank You for Your Purchase',
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            if (orderData.shipping_phone) {
                await this.notificationQueue.add('sms', {
                    to: orderData.shipping_phone,
                    message: smsTemplate
                });
            }

            await this.notificationQueue.add('push', {
                userId: userId,
                title: 'Payment Confirmed!',
                body: `Payment received for order #${orderData.order_number}.`,
                data: { orderId: orderData.id, orderNumber: orderData.order_number }
            });

            logger.info(`Payment confirmation notifications queued for user ${userId}`);
        } catch (error) {
            logger.error('Payment confirmation notification error:', error);
            throw error;
        }
    }

    async sendOrderCancellation(userId, orderData) {
        try {
            const emailTemplate = this.getOrderCancellationEmailTemplate(orderData);
            const smsTemplate = this.getOrderCancellationSMSTemplate(orderData);

            await this.notificationQueue.add('email', {
                to: orderData.shipping_email,
                subject: 'Order Cancelled',
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            if (orderData.shipping_phone) {
                await this.notificationQueue.add('sms', {
                    to: orderData.shipping_phone,
                    message: smsTemplate
                });
            }

            await this.notificationQueue.add('push', {
                userId: userId,
                title: 'Order Cancelled',
                body: `Your order #${orderData.order_number} has been cancelled.`,
                data: { orderId: orderData.id, orderNumber: orderData.order_number }
            });

            logger.info(`Order cancellation notifications queued for user ${userId}`);
        } catch (error) {
            logger.error('Order cancellation notification error:', error);
            throw error;
        }
    }

    async sendWelcomeEmail(userId, userData) {
        try {
            const emailTemplate = this.getWelcomeEmailTemplate(userData);

            await this.notificationQueue.add('email', {
                to: userData.email,
                subject: 'Welcome to Our eCommerce Platform!',
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            await this.notificationQueue.add('push', {
                userId: userId,
                title: 'Welcome!',
                body: 'Thank you for joining our platform. Start shopping now!',
                data: { type: 'welcome' }
            });

            logger.info(`Welcome notifications queued for user ${userId}`);
        } catch (error) {
            logger.error('Welcome notification error:', error);
            throw error;
        }
    }

    async getUserNotifications(userId, limit = 20) {
        try {
            const notifications = await this.redisClient.lRange(`notifications:${userId}`, 0, limit - 1);
            return notifications.map(notification => JSON.parse(notification));
        } catch (error) {
            logger.error('Get user notifications error:', error);
            throw error;
        }
    }

    async markNotificationAsRead(userId, notificationId) {
        try {
            const notifications = await this.getUserNotifications(userId, 100);
            const updatedNotifications = notifications.map(notification => {
                if (notification.id === notificationId) {
                    notification.read = true;
                }
                return notification;
            });

            // Update notifications in Redis
            await this.redisClient.del(`notifications:${userId}`);
            for (const notification of updatedNotifications) {
                await this.redisClient.rPush(`notifications:${userId}`, JSON.stringify(notification));
            }

            logger.info(`Notification ${notificationId} marked as read for user ${userId}`);
        } catch (error) {
            logger.error('Mark notification as read error:', error);
            throw error;
        }
    }

    // Email Templates
    getOrderConfirmationEmailTemplate(orderData) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Order Confirmation</h2>
                <p>Dear Customer,</p>
                <p>Thank you for your order! Your order has been successfully placed.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0;">
                    <h3>Order Details:</h3>
                    <p><strong>Order Number:</strong> ${orderData.order_number}</p>
                    <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleDateString()}</p>
                    <p><strong>Total Amount:</strong> ₹${orderData.total_amount}</p>
                </div>
                
                <p>We will send you updates about your order status.</p>
                <p>Thank you for choosing us!</p>
            </div>
        `;

        const text = `
            Order Confirmation
            
            Dear Customer,
            
            Thank you for your order! Your order has been successfully placed.
            
            Order Details:
            - Order Number: ${orderData.order_number}
            - Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
            - Total Amount: ₹${orderData.total_amount}
            
            We will send you updates about your order status.
            
            Thank you for choosing us!
        `;

        return { html, text };
    }

    getOrderStatusEmailTemplate(orderData, status) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Order Status Update</h2>
                <p>Dear Customer,</p>
                <p>Your order status has been updated.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0;">
                    <h3>Order Details:</h3>
                    <p><strong>Order Number:</strong> ${orderData.order_number}</p>
                    <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
                    <p><strong>Updated Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <p>Thank you for your patience!</p>
            </div>
        `;

        const text = `
            Order Status Update
            
            Dear Customer,
            
            Your order status has been updated.
            
            Order Details:
            - Order Number: ${orderData.order_number}
            - New Status: ${status.toUpperCase()}
            - Updated Date: ${new Date().toLocaleDateString()}
            
            Thank you for your patience!
        `;

        return { html, text };
    }

    getPaymentConfirmationEmailTemplate(orderData) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Payment Confirmed</h2>
                <p>Dear Customer,</p>
                <p>Your payment has been successfully processed!</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0;">
                    <h3>Payment Details:</h3>
                    <p><strong>Order Number:</strong> ${orderData.order_number}</p>
                    <p><strong>Amount Paid:</strong> ₹${orderData.total_amount}</p>
                    <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <p>Your order is now being processed.</p>
                <p>Thank you for your purchase!</p>
            </div>
        `;

        const text = `
            Payment Confirmed
            
            Dear Customer,
            
            Your payment has been successfully processed!
            
            Payment Details:
            - Order Number: ${orderData.order_number}
            - Amount Paid: ₹${orderData.total_amount}
            - Payment Date: ${new Date().toLocaleDateString()}
            
            Your order is now being processed.
            
            Thank you for your purchase!
        `;

        return { html, text };
    }

    getOrderCancellationEmailTemplate(orderData) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Order Cancelled</h2>
                <p>Dear Customer,</p>
                <p>Your order has been cancelled as requested.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0;">
                    <h3>Order Details:</h3>
                    <p><strong>Order Number:</strong> ${orderData.order_number}</p>
                    <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <p>If you have any questions, please contact our support team.</p>
                <p>We hope to serve you again soon!</p>
            </div>
        `;

        const text = `
            Order Cancelled
            
            Dear Customer,
            
            Your order has been cancelled as requested.
            
            Order Details:
            - Order Number: ${orderData.order_number}
            - Cancellation Date: ${new Date().toLocaleDateString()}
            
            If you have any questions, please contact our support team.
            
            We hope to serve you again soon!
        `;

        return { html, text };
    }

    getWelcomeEmailTemplate(userData) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Our Platform!</h2>
                <p>Dear ${userData.firstName},</p>
                <p>Welcome to our eCommerce platform! We're excited to have you as part of our community.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0;">
                    <h3>Get Started:</h3>
                    <ul>
                        <li>Browse our latest products</li>
                        <li>Create your wishlist</li>
                        <li>Enjoy exclusive offers</li>
                    </ul>
                </div>
                
                <p>Happy shopping!</p>
            </div>
        `;

        const text = `
            Welcome to Our Platform!
            
            Dear ${userData.firstName},
            
            Welcome to our eCommerce platform! We're excited to have you as part of our community.
            
            Get Started:
            - Browse our latest products
            - Create your wishlist
            - Enjoy exclusive offers
            
            Happy shopping!
        `;

        return { html, text };
    }

    // SMS Templates
    getOrderConfirmationSMSTemplate(orderData) {
        return `Order confirmed! Order #${orderData.order_number} for ₹${orderData.total_amount} has been placed. We'll keep you updated on the status.`;
    }

    getOrderStatusSMSTemplate(orderData, status) {
        return `Order #${orderData.order_number} status updated to ${status.toUpperCase()}. Track your order on our website.`;
    }

    getPaymentConfirmationSMSTemplate(orderData) {
        return `Payment confirmed for order #${orderData.order_number}. Amount: ₹${orderData.total_amount}. Your order is being processed.`;
    }

    getOrderCancellationSMSTemplate(orderData) {
        return `Order #${orderData.order_number} has been cancelled as requested. Contact support if you have any questions.`;
    }
}

module.exports = new NotificationService(); 