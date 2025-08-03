const Product = require('../models/Product');
const Category = require('../models/Category');
const redis = require('redis');
const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.redisClient.connect();
  }

  // Get all products with pagination and filters
  async getProducts(filters = {}, page = 1, limit = 20, sort = {}) {
    try {
      const cacheKey = `products:${JSON.stringify(filters)}:${page}:${limit}:${JSON.stringify(sort)}`;
      
      // Try to get from cache first
      const cachedData = await this.redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Build query
      const query = { isActive: true };
      
      if (filters.brand) {
        query.brand = { $in: Array.isArray(filters.brand) ? filters.brand : [filters.brand] };
      }
      
      if (filters.category) {
        query.category = { $in: Array.isArray(filters.category) ? filters.category : [filters.category] };
      }
      
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
      }
      
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      if (filters.inStock) {
        query.stock = { $gt: 0 };
      }

      // Execute query
      const skip = (page - 1) * limit;
      const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);
      
      const result = {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result for 5 minutes
      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error getting products:', error);
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id) {
    try {
      const cacheKey = `product:${id}`;
      
      // Try to get from cache first
      const cachedProduct = await this.redisClient.get(cacheKey);
      if (cachedProduct) {
        return JSON.parse(cachedProduct);
      }

      const product = await Product.findById(id).lean();
      
      if (!product) {
        throw new Error('Product not found');
      }

      // Cache the product for 10 minutes
      await this.redisClient.setEx(cacheKey, 600, JSON.stringify(product));
      
      return product;
    } catch (error) {
      logger.error('Error getting product by ID:', error);
      throw error;
    }
  }

  // Get product by SKU
  async getProductBySku(sku) {
    try {
      const cacheKey = `product:sku:${sku}`;
      
      const cachedProduct = await this.redisClient.get(cacheKey);
      if (cachedProduct) {
        return JSON.parse(cachedProduct);
      }

      const product = await Product.findOne({ sku, isActive: true }).lean();
      
      if (!product) {
        throw new Error('Product not found');
      }

      await this.redisClient.setEx(cacheKey, 600, JSON.stringify(product));
      
      return product;
    } catch (error) {
      logger.error('Error getting product by SKU:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(searchTerm, filters = {}, page = 1, limit = 20) {
    try {
      const cacheKey = `search:${searchTerm}:${JSON.stringify(filters)}:${page}:${limit}`;
      
      const cachedResults = await this.redisClient.get(cacheKey);
      if (cachedResults) {
        return JSON.parse(cachedResults);
      }

      const query = {
        isActive: true,
        $text: { $search: searchTerm }
      };

      // Add filters
      if (filters.brand) query.brand = filters.brand;
      if (filters.category) query.category = filters.category;
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
      }

      const skip = (page - 1) * limit;
      const products = await Product.find(query)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);
      
      const result = {
        products,
        searchTerm,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  // Get featured products
  async getFeaturedProducts(limit = 10) {
    try {
      const cacheKey = `featured:products:${limit}`;
      
      const cachedProducts = await this.redisClient.get(cacheKey);
      if (cachedProducts) {
        return JSON.parse(cachedProducts);
      }

      const products = await Product.find({
        isActive: true,
        isFeatured: true,
        stock: { $gt: 0 }
      })
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(limit)
      .lean();

      await this.redisClient.setEx(cacheKey, 600, JSON.stringify(products));
      
      return products;
    } catch (error) {
      logger.error('Error getting featured products:', error);
      throw error;
    }
  }

  // Get products by brand
  async getProductsByBrand(brand, page = 1, limit = 20) {
    try {
      const cacheKey = `brand:${brand}:${page}:${limit}`;
      
      const cachedProducts = await this.redisClient.get(cacheKey);
      if (cachedProducts) {
        return JSON.parse(cachedProducts);
      }

      const skip = (page - 1) * limit;
      const products = await Product.find({
        brand,
        isActive: true
      })
      .sort({ price: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

      const total = await Product.countDocuments({ brand, isActive: true });
      
      const result = {
        products,
        brand,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error getting products by brand:', error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(category, page = 1, limit = 20) {
    try {
      const cacheKey = `category:${category}:${page}:${limit}`;
      
      const cachedProducts = await this.redisClient.get(cacheKey);
      if (cachedProducts) {
        return JSON.parse(cachedProducts);
      }

      const skip = (page - 1) * limit;
      const products = await Product.find({
        category,
        isActive: true
      })
      .sort({ price: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

      const total = await Product.countDocuments({ category, isActive: true });
      
      const result = {
        products,
        category,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error getting products by category:', error);
      throw error;
    }
  }

  // Update product stock
  async updateStock(productId, quantity) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      product.stock = Math.max(0, product.stock + quantity);
      await product.save();

      // Invalidate cache
      await this.redisClient.del(`product:${productId}`);
      await this.redisClient.del(`product:sku:${product.sku}`);
      
      return product;
    } catch (error) {
      logger.error('Error updating product stock:', error);
      throw error;
    }
  }

  // Add product review
  async addReview(productId, userId, rating, comment) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if user already reviewed
      const existingReview = product.reviews.find(review => 
        review.userId.toString() === userId.toString()
      );

      if (existingReview) {
        throw new Error('User has already reviewed this product');
      }

      product.reviews.push({
        userId,
        rating,
        comment,
        date: new Date()
      });

      await product.save();

      // Invalidate cache
      await this.redisClient.del(`product:${productId}`);
      
      return product;
    } catch (error) {
      logger.error('Error adding product review:', error);
      throw error;
    }
  }

  // Get all brands
  async getBrands() {
    try {
      const cacheKey = 'brands:all';
      
      const cachedBrands = await this.redisClient.get(cacheKey);
      if (cachedBrands) {
        return JSON.parse(cachedBrands);
      }

      const brands = await Product.distinct('brand', { isActive: true });
      
      await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(brands));
      
      return brands;
    } catch (error) {
      logger.error('Error getting brands:', error);
      throw error;
    }
  }

  // Get all categories
  async getCategories() {
    try {
      const cacheKey = 'categories:all';
      
      const cachedCategories = await this.redisClient.get(cacheKey);
      if (cachedCategories) {
        return JSON.parse(cachedCategories);
      }

      const categories = await Category.getCategoriesWithCount();
      
      await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(categories));
      
      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  // Clear cache
  async clearCache() {
    try {
      await this.redisClient.flushAll();
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing cache:', error);
      throw error;
    }
  }
}

module.exports = new ProductService(); 