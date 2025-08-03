const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Mock dependencies
jest.mock('http-proxy-middleware');
jest.mock('redis');
jest.mock('axios');

const app = express();

// Mock middleware and routes
const authMiddleware = require('../middleware/auth');
const gatewayRoutes = require('../routes/gateway');

app.use('/api', authMiddleware);
app.use('/api', gatewayRoutes);

describe('API Gateway', () => {
  let mockProxy;
  let mockRedis;
  let mockAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup proxy mock
    mockProxy = jest.fn();
    createProxyMiddleware.mockReturnValue(mockProxy);
    
    // Setup Redis mock
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn()
    };
    
    // Setup Axios mock
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };
  });

  describe('Authentication Middleware', () => {
    it('should allow requests to public endpoints without token', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .expect(200);
      
      expect(response.status).toBe(200);
    });

    it('should reject requests to protected endpoints without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);
      
      expect(response.status).toBe(401);
    });

    it('should allow requests with valid JWT token', async () => {
      const token = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.status).toBe(200);
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Service Routing', () => {
    it('should route auth requests to user service', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(createProxyMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          target: process.env.USER_SERVICE_URL
        })
      );
    });

    it('should route product requests to product service', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);
      
      expect(createProxyMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          target: process.env.PRODUCT_SERVICE_URL
        })
      );
    });

    it('should route order requests to order service', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(200);
      
      expect(createProxyMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          target: process.env.ORDER_SERVICE_URL
        })
      );
    });

    it('should route notification requests to notification service', async () => {
      const response = await request(app)
        .post('/api/notifications/email')
        .send({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(200);
      
      expect(createProxyMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          target: process.env.NOTIFICATION_SERVICE_URL
        })
      );
    });
  });

  describe('Aggregated Endpoints', () => {
    it('should return dashboard stats', async () => {
      const token = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalProducts');
    });

    it('should return recent orders', async () => {
      const token = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/dashboard/recent-orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return popular products', async () => {
      const response = await request(app)
        .get('/api/dashboard/popular-products')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Search Endpoint', () => {
    it('should perform aggregated search', async () => {
      const response = await request(app)
        .get('/api/search?q=iphone')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('categories');
    });

    it('should handle search with filters', async () => {
      const response = await request(app)
        .get('/api/search?q=iphone&category=smartphones&minPrice=50000')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Rate Limiting', () => {
    it('should limit requests per IP', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/products');
      }
      
      const response = await request(app)
        .get('/api/products')
        .expect(429);
      
      expect(response.status).toBe(429);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/products')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability', async () => {
      // Mock service down
      createProxyMiddleware.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/products')
        .expect(503);
      
      expect(response.body).toHaveProperty('error', 'Service temporarily unavailable');
    });

    it('should handle proxy errors', async () => {
      mockProxy.mockImplementation((req, res, next) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      const response = await request(app)
        .get('/api/products')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request Logging', () => {
    it('should log incoming requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/api/products')
        .expect(200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/products')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Response Time', () => {
    it('should add response time header', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);
      
      expect(response.headers).toHaveProperty('x-response-time');
    });
  });
}); 