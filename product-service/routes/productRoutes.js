const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const rateLimit = require('express-rate-limit');

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
router.get('/health', productController.healthCheck);

// Get all products with filters and pagination
router.get('/', productController.getProducts);

// Get featured products
router.get('/featured', productController.getFeaturedProducts);

// Search products
router.get('/search', productController.searchProducts);

// Get all brands
router.get('/brands', productController.getBrands);

// Get all categories
router.get('/categories', productController.getCategories);

// Get product by ID
router.get('/:id', productController.getProductById);

// Get product by SKU
router.get('/sku/:sku', productController.getProductBySku);

// Get products by brand
router.get('/brand/:brand', productController.getProductsByBrand);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Update product stock (protected route)
router.patch('/:id/stock', productController.updateStock);

// Add product review (protected route)
router.post('/:id/reviews', productController.addReview);

// Clear cache (admin route)
router.delete('/cache', productController.clearCache);

module.exports = router; 