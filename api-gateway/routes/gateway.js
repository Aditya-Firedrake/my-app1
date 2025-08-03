const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

// Apply rate limiting to all routes
router.use(limiter);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API Gateway is running',
        timestamp: new Date().toISOString()
    });
});

// User Service Routes
const userServiceProxy = createProxyMiddleware({
    target: process.env.USER_SERVICE_URL || 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': '/api/users'
    },
    onProxyReq: (proxyReq, req, res) => {
        logger.info(`Proxying to User Service: ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
        logger.error('User Service proxy error:', err);
        res.status(503).json({
            success: false,
            message: 'User Service is temporarily unavailable'
        });
    }
});

// Public user routes (no auth required)
router.use('/api/users/register', userServiceProxy);
router.use('/api/users/login', userServiceProxy);
router.use('/api/users/validate', userServiceProxy);

// Protected user routes (auth required)
router.use('/api/users/profile', auth.authenticate, userServiceProxy);
router.use('/api/users/:userId', auth.authenticate, userServiceProxy);

// Product Service Routes
const productServiceProxy = createProxyMiddleware({
    target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/api/products': '/api/products'
    },
    onProxyReq: (proxyReq, req, res) => {
        logger.info(`Proxying to Product Service: ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
        logger.error('Product Service proxy error:', err);
        res.status(503).json({
            success: false,
            message: 'Product Service is temporarily unavailable'
        });
    }
});

// Public product routes
router.use('/api/products', productServiceProxy);

// Order Service Routes
const orderServiceProxy = createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/api/orders': '/api/orders'
    },
    onProxyReq: (proxyReq, req, res) => {
        logger.info(`Proxying to Order Service: ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
        logger.error('Order Service proxy error:', err);
        res.status(503).json({
            success: false,
            message: 'Order Service is temporarily unavailable'
        });
    }
});

// Cart routes (optional auth)
router.use('/api/cart', auth.optionalAuth, orderServiceProxy);

// Order routes (auth required)
router.use('/api/orders', auth.authenticate, orderServiceProxy);

// Checkout route (auth required)
router.use('/api/checkout', auth.authenticate, orderServiceProxy);

// Notification Service Routes
const notificationServiceProxy = createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/api/notifications': '/api/notifications'
    },
    onProxyReq: (proxyReq, req, res) => {
        logger.info(`Proxying to Notification Service: ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
        logger.error('Notification Service proxy error:', err);
        res.status(503).json({
            success: false,
            message: 'Notification Service is temporarily unavailable'
        });
    }
});

// Notification routes (auth required)
router.use('/api/notifications', auth.authenticate, notificationServiceProxy);

// Admin Routes (admin auth required)
const adminRoutes = express.Router();

// Admin product management
adminRoutes.use('/api/admin/products', auth.authenticate, auth.requireAdmin, productServiceProxy);

// Admin order management
adminRoutes.use('/api/admin/orders', auth.authenticate, auth.requireAdmin, orderServiceProxy);

// Admin user management
adminRoutes.use('/api/admin/users', auth.authenticate, auth.requireAdmin, userServiceProxy);

router.use(adminRoutes);

// Search endpoint (aggregates from multiple services)
router.get('/api/search', auth.optionalAuth, async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const results = {};

        // Search products
        if (type === 'all' || type === 'products') {
            try {
                const axios = require('axios');
                const productResponse = await axios.get(
                    `${process.env.PRODUCT_SERVICE_URL}/api/products/search?q=${encodeURIComponent(q)}`,
                    { timeout: 5000 }
                );
                results.products = productResponse.data;
            } catch (error) {
                logger.error('Product search error:', error.message);
                results.products = { success: false, message: 'Product search unavailable' };
            }
        }

        res.json({
            success: true,
            query: q,
            results: results
        });
    } catch (error) {
        logger.error('Search aggregation error:', error);
        res.status(500).json({
            success: false,
            message: 'Search service error'
        });
    }
});

// Dashboard endpoint (aggregates user data)
router.get('/api/dashboard', auth.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const axios = require('axios');

        const dashboard = {};

        // Get user profile
        try {
            const userResponse = await axios.get(
                `${process.env.USER_SERVICE_URL}/api/users/${userId}`,
                {
                    headers: { Authorization: req.headers.authorization },
                    timeout: 5000
                }
            );
            dashboard.profile = userResponse.data;
        } catch (error) {
            logger.error('User profile fetch error:', error.message);
        }

        // Get user orders
        try {
            const orderResponse = await axios.get(
                `${process.env.ORDER_SERVICE_URL}/api/orders?limit=5`,
                {
                    headers: { Authorization: req.headers.authorization },
                    timeout: 5000
                }
            );
            dashboard.recentOrders = orderResponse.data;
        } catch (error) {
            logger.error('Recent orders fetch error:', error.message);
        }

        // Get order statistics
        try {
            const statsResponse = await axios.get(
                `${process.env.ORDER_SERVICE_URL}/api/orders/statistics`,
                {
                    headers: { Authorization: req.headers.authorization },
                    timeout: 5000
                }
            );
            dashboard.statistics = statsResponse.data;
        } catch (error) {
            logger.error('Order statistics fetch error:', error.message);
        }

        // Get user notifications
        try {
            const notificationResponse = await axios.get(
                `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/user/${userId}?limit=10`,
                {
                    headers: { Authorization: req.headers.authorization },
                    timeout: 5000
                }
            );
            dashboard.notifications = notificationResponse.data;
        } catch (error) {
            logger.error('User notifications fetch error:', error.message);
        }

        res.json({
            success: true,
            dashboard: dashboard
        });
    } catch (error) {
        logger.error('Dashboard aggregation error:', error);
        res.status(500).json({
            success: false,
            message: 'Dashboard service error'
        });
    }
});

// 404 handler for unmatched routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

module.exports = router; 