const productService = require('../services/productService');
const logger = require('../utils/logger');

class ProductController {
  // Get all products with filters and pagination
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        brand,
        category,
        minPrice,
        maxPrice,
        search,
        inStock,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        brand: brand ? brand.split(',') : undefined,
        category: category ? category.split(',') : undefined,
        minPrice,
        maxPrice,
        search,
        inStock: inStock === 'true'
      };

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const result = await productService.getProducts(
        filters,
        parseInt(page),
        parseInt(limit),
        sort
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  }

  // Get product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Error in getProductById:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message
      });
    }
  }

  // Get product by SKU
  async getProductBySku(req, res) {
    try {
      const { sku } = req.params;
      const product = await productService.getProductBySku(sku);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Error in getProductBySku:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message
      });
    }
  }

  // Search products
  async searchProducts(req, res) {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        brand,
        category,
        minPrice,
        maxPrice
      } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const filters = {
        brand,
        category,
        minPrice,
        maxPrice
      };

      const result = await productService.searchProducts(
        q,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in searchProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search products',
        error: error.message
      });
    }
  }

  // Get featured products
  async getFeaturedProducts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const products = await productService.getFeaturedProducts(parseInt(limit));

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Error in getFeaturedProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch featured products',
        error: error.message
      });
    }
  }

  // Get products by brand
  async getProductsByBrand(req, res) {
    try {
      const { brand } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await productService.getProductsByBrand(
        brand,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getProductsByBrand:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products by brand',
        error: error.message
      });
    }
  }

  // Get products by category
  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await productService.getProductsByCategory(
        category,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getProductsByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products by category',
        error: error.message
      });
    }
  }

  // Update product stock
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a number'
        });
      }

      const product = await productService.updateStock(id, quantity);

      res.json({
        success: true,
        data: {
          id: product._id,
          sku: product.sku,
          stock: product.stock
        },
        message: 'Stock updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateStock:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message
      });
    }
  }

  // Add product review
  async addReview(req, res) {
    try {
      const { id } = req.params;
      const { userId, rating, comment } = req.body;

      if (!userId || !rating) {
        return res.status(400).json({
          success: false,
          message: 'User ID and rating are required'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const product = await productService.addReview(id, userId, rating, comment);

      res.json({
        success: true,
        data: {
          id: product._id,
          ratings: product.ratings,
          reviewsCount: product.reviews.length
        },
        message: 'Review added successfully'
      });
    } catch (error) {
      logger.error('Error in addReview:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (error.message === 'User has already reviewed this product') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add review',
        error: error.message
      });
    }
  }

  // Get all brands
  async getBrands(req, res) {
    try {
      const brands = await productService.getBrands();

      res.json({
        success: true,
        data: brands
      });
    } catch (error) {
      logger.error('Error in getBrands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brands',
        error: error.message
      });
    }
  }

  // Get all categories
  async getCategories(req, res) {
    try {
      const categories = await productService.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error in getCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  // Health check
  async healthCheck(req, res) {
    res.json({
      success: true,
      message: 'Product Service is running',
      timestamp: new Date().toISOString()
    });
  }

  // Clear cache
  async clearCache(req, res) {
    try {
      await productService.clearCache();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      logger.error('Error in clearCache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error.message
      });
    }
  }
}

module.exports = new ProductController(); 