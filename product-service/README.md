# Product Service

A Node.js Express microservice for product management, catalog, search, and inventory in the eCommerce platform.

## Features

- Product catalog management
- Category management
- Advanced search and filtering
- Inventory tracking
- Product reviews and ratings
- Image management
- Redis caching for performance
- Rate limiting and security

## Technology Stack

- **Framework**: Express.js
- **Language**: Node.js
- **Database**: MongoDB
- **Cache**: Redis
- **ORM**: Mongoose
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Container**: Docker

## Prerequisites

- Node.js 18 or higher
- MongoDB
- Redis
- Docker (optional)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up product-service
```

### Manual Setup

1. **Clone and navigate to the service**
   ```bash
   cd product-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   npm start
   ```

The service will start on `http://localhost:8082`

## API Endpoints

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Get all products with pagination | No |
| GET | `/api/products/:id` | Get product by ID | No |
| POST | `/api/products` | Create new product | Yes |
| PUT | `/api/products/:id` | Update product | Yes |
| DELETE | `/api/products/:id` | Delete product | Yes |
| GET | `/api/products/search` | Search products | No |
| GET | `/api/products/category/:categoryId` | Get products by category | No |

### Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | Get all categories | No |
| GET | `/api/categories/:id` | Get category by ID | No |
| POST | `/api/categories` | Create new category | Yes |
| PUT | `/api/categories/:id` | Update category | Yes |
| DELETE | `/api/categories/:id` | Delete category | Yes |

### Inventory

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PUT | `/api/products/:id/stock` | Update product stock | Yes |
| GET | `/api/products/:id/stock` | Get product stock | No |

## Request/Response Examples

### Create Product

```bash
POST /api/products
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with advanced features",
  "price": 99999,
  "categoryId": "507f1f77bcf86cd799439011",
  "brand": "Apple",
  "model": "iPhone 15 Pro",
  "specifications": {
    "storage": "256GB",
    "color": "Titanium",
    "screen": "6.1 inch",
    "camera": "48MP"
  },
  "images": [
    "https://example.com/iphone15pro1.jpg",
    "https://example.com/iphone15pro2.jpg"
  ],
  "stock": 50,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone with advanced features",
    "price": 99999,
    "categoryId": "507f1f77bcf86cd799439011",
    "brand": "Apple",
    "model": "iPhone 15 Pro",
    "specifications": {
      "storage": "256GB",
      "color": "Titanium",
      "screen": "6.1 inch",
      "camera": "48MP"
    },
    "images": [
      "https://example.com/iphone15pro1.jpg",
      "https://example.com/iphone15pro2.jpg"
    ],
    "stock": 50,
    "rating": 0,
    "reviewCount": 0,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Search Products

```bash
GET /api/products/search?q=iphone&category=smartphones&minPrice=50000&maxPrice=100000&sort=price&order=asc&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "iPhone 15 Pro",
        "price": 99999,
        "brand": "Apple",
        "rating": 4.5,
        "reviewCount": 120,
        "images": ["https://example.com/iphone15pro1.jpg"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 8082 |
| `MONGODB_URI` | MongoDB connection string | mongodb://mongodb:27017/ecommerce_products |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Database Schema

### Product Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  categoryId: ObjectId,
  brand: String,
  model: String,
  specifications: {
    storage: String,
    color: String,
    screen: String,
    camera: String,
    battery: String,
    processor: String
  },
  images: [String],
  stock: Number,
  rating: Number,
  reviewCount: Number,
  reviews: [{
    userId: ObjectId,
    rating: Number,
    comment: String,
    createdAt: Date
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  image: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Docker

```bash
# Build image
docker build -t product-service .

# Run container
docker run -p 8082:8082 --env-file .env product-service
```

## Caching Strategy

The service uses Redis for caching:

- **Product Details**: Cached for 1 hour
- **Product Lists**: Cached for 30 minutes
- **Categories**: Cached for 2 hours
- **Search Results**: Cached for 15 minutes

Cache invalidation occurs on:
- Product updates
- Stock changes
- Category updates

## Performance Optimization

- Redis caching for frequently accessed data
- Database indexing on search fields
- Pagination for large datasets
- Image optimization and CDN integration
- Rate limiting to prevent abuse

## Security

- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration
- Helmet for security headers
- JWT authentication for protected endpoints

## Monitoring

- Winston logging with different levels
- Request/response logging
- Error tracking
- Performance metrics

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Redis Connection Failed**
   - Ensure Redis is running
   - Check Redis configuration in `.env`

3. **High Memory Usage**
   - Check for memory leaks in caching
   - Monitor Redis memory usage
   - Review database query optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 