const ProductService = require('../services/productService');
const Product = require('../models/Product');
const Category = require('../models/Category');
const redis = require('redis');

// Mock dependencies
jest.mock('../models/Product');
jest.mock('../models/Category');
jest.mock('redis');

describe('ProductService', () => {
  let productService;
  let mockRedis;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup Redis mock
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      setEx: jest.fn()
    };
    
    // Mock Redis client
    redis.createClient.mockReturnValue(mockRedis);
    
    productService = new ProductService();
  });

  describe('getAllProducts', () => {
    it('should return products from cache if available', async () => {
      const cachedProducts = [
        { id: '1', name: 'iPhone 15', price: 99999 },
        { id: '2', name: 'Samsung Galaxy', price: 89999 }
      ];
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedProducts));
      
      const result = await productService.getAllProducts(1, 10);
      
      expect(result).toEqual(cachedProducts);
      expect(mockRedis.get).toHaveBeenCalledWith('products:page:1:limit:10');
      expect(Product.find).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const products = [
        { id: '1', name: 'iPhone 15', price: 99999 },
        { id: '2', name: 'Samsung Galaxy', price: 89999 }
      ];
      
      mockRedis.get.mockResolvedValue(null);
      Product.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(products)
          })
        })
      });
      Product.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2)
      });
      
      const result = await productService.getAllProducts(1, 10);
      
      expect(result.products).toEqual(products);
      expect(result.pagination.total).toBe(2);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'products:page:1:limit:10',
        1800,
        expect.any(String)
      );
    });
  });

  describe('getProductById', () => {
    it('should return product from cache if available', async () => {
      const cachedProduct = { id: '1', name: 'iPhone 15', price: 99999 };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedProduct));
      
      const result = await productService.getProductById('1');
      
      expect(result).toEqual(cachedProduct);
      expect(mockRedis.get).toHaveBeenCalledWith('product:1');
      expect(Product.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const product = { id: '1', name: 'iPhone 15', price: 99999 };
      
      mockRedis.get.mockResolvedValue(null);
      Product.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(product)
      });
      
      const result = await productService.getProductById('1');
      
      expect(result).toEqual(product);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'product:1',
        3600,
        JSON.stringify(product)
      );
    });

    it('should throw error if product not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      Product.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      
      await expect(productService.getProductById('999')).rejects.toThrow('Product not found');
    });
  });

  describe('createProduct', () => {
    it('should create product and invalidate cache', async () => {
      const productData = {
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 99999,
        categoryId: 'category1',
        brand: 'Apple',
        stock: 50
      };
      
      const createdProduct = { id: '1', ...productData };
      
      Product.create.mockResolvedValue(createdProduct);
      
      const result = await productService.createProduct(productData);
      
      expect(result).toEqual(createdProduct);
      expect(Product.create).toHaveBeenCalledWith(productData);
      expect(mockRedis.del).toHaveBeenCalledWith('products:page:*');
    });
  });

  describe('updateProduct', () => {
    it('should update product and invalidate cache', async () => {
      const productId = '1';
      const updateData = { name: 'iPhone 15 Pro Max', price: 109999 };
      const updatedProduct = { id: productId, ...updateData };
      
      Product.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct)
      });
      
      const result = await productService.updateProduct(productId, updateData);
      
      expect(result).toEqual(updatedProduct);
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        updateData,
        { new: true }
      );
      expect(mockRedis.del).toHaveBeenCalledWith(`product:${productId}`);
      expect(mockRedis.del).toHaveBeenCalledWith('products:page:*');
    });

    it('should throw error if product not found', async () => {
      Product.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      
      await expect(productService.updateProduct('999', {})).rejects.toThrow('Product not found');
    });
  });

  describe('deleteProduct', () => {
    it('should delete product and invalidate cache', async () => {
      const productId = '1';
      const deletedProduct = { id: productId, name: 'iPhone 15' };
      
      Product.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedProduct)
      });
      
      const result = await productService.deleteProduct(productId);
      
      expect(result).toEqual(deletedProduct);
      expect(Product.findByIdAndDelete).toHaveBeenCalledWith(productId);
      expect(mockRedis.del).toHaveBeenCalledWith(`product:${productId}`);
      expect(mockRedis.del).toHaveBeenCalledWith('products:page:*');
    });

    it('should throw error if product not found', async () => {
      Product.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      
      await expect(productService.deleteProduct('999')).rejects.toThrow('Product not found');
    });
  });

  describe('searchProducts', () => {
    it('should search products with filters', async () => {
      const searchQuery = 'iphone';
      const filters = { category: 'smartphones', minPrice: 50000, maxPrice: 100000 };
      const products = [
        { id: '1', name: 'iPhone 15', price: 99999, brand: 'Apple' }
      ];
      
      Product.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(products)
          })
        })
      });
      Product.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1)
      });
      
      const result = await productService.searchProducts(searchQuery, filters, 1, 10);
      
      expect(result.products).toEqual(products);
      expect(result.pagination.total).toBe(1);
      expect(Product.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $text: { $search: searchQuery },
          categoryId: filters.category,
          price: { $gte: filters.minPrice, $lte: filters.maxPrice }
        })
      );
    });
  });

  describe('getProductsByCategory', () => {
    it('should return products by category', async () => {
      const categoryId = 'category1';
      const products = [
        { id: '1', name: 'iPhone 15', categoryId },
        { id: '2', name: 'Samsung Galaxy', categoryId }
      ];
      
      Product.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(products)
          })
        })
      });
      Product.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2)
      });
      
      const result = await productService.getProductsByCategory(categoryId, 1, 10);
      
      expect(result.products).toEqual(products);
      expect(result.pagination.total).toBe(2);
      expect(Product.find).toHaveBeenCalledWith({ categoryId });
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      const productId = '1';
      const quantity = 5;
      const product = { id: productId, stock: 50 };
      
      Product.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(product)
      });
      Product.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...product, stock: 45 })
      });
      
      const result = await productService.updateStock(productId, quantity);
      
      expect(result.stock).toBe(45);
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        { stock: 45 },
        { new: true }
      );
      expect(mockRedis.del).toHaveBeenCalledWith(`product:${productId}`);
    });

    it('should throw error if insufficient stock', async () => {
      const productId = '1';
      const quantity = 60;
      const product = { id: productId, stock: 50 };
      
      Product.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(product)
      });
      
      await expect(productService.updateStock(productId, quantity)).rejects.toThrow('Insufficient stock');
    });
  });

  describe('addReview', () => {
    it('should add review to product', async () => {
      const productId = '1';
      const review = {
        userId: 'user1',
        rating: 5,
        comment: 'Great product!'
      };
      
      const product = {
        id: productId,
        reviews: [],
        rating: 0,
        reviewCount: 0
      };
      
      Product.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(product)
      });
      Product.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...product,
          reviews: [review],
          rating: 5,
          reviewCount: 1
        })
      });
      
      const result = await productService.addReview(productId, review);
      
      expect(result.reviews).toHaveLength(1);
      expect(result.rating).toBe(5);
      expect(result.reviewCount).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith(`product:${productId}`);
    });
  });

  describe('getCategories', () => {
    it('should return categories from cache if available', async () => {
      const cachedCategories = [
        { id: '1', name: 'Smartphones' },
        { id: '2', name: 'Tablets' }
      ];
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedCategories));
      
      const result = await productService.getCategories();
      
      expect(result).toEqual(cachedCategories);
      expect(mockRedis.get).toHaveBeenCalledWith('categories');
    });

    it('should fetch from database and cache if not in cache', async () => {
      const categories = [
        { id: '1', name: 'Smartphones' },
        { id: '2', name: 'Tablets' }
      ];
      
      mockRedis.get.mockResolvedValue(null);
      Category.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(categories)
      });
      
      const result = await productService.getCategories();
      
      expect(result).toEqual(categories);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'categories',
        7200,
        JSON.stringify(categories)
      );
    });
  });
}); 