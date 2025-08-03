# API Gateway

A Node.js Express microservice that acts as the central entry point for all external requests to the eCommerce platform, providing routing, authentication, and request aggregation.

## Features

- Centralized routing to microservices
- JWT-based authentication and authorization
- Request/response aggregation
- Rate limiting and security
- Health monitoring and load balancing
- CORS handling
- Request logging and monitoring

## Technology Stack

- **Framework**: Express.js
- **Language**: Node.js
- **Proxy**: http-proxy-middleware
- **Cache**: Redis
- **Security**: JWT, Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Container**: Docker

## Prerequisites

- Node.js 18 or higher
- Redis
- Docker (optional)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up api-gateway
```

### Manual Setup

1. **Clone and navigate to the service**
   ```bash
   cd api-gateway
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

The service will start on `http://localhost:8080`

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/validate` | Validate JWT token | No |

### User Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/profile` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update user profile | Yes |
| DELETE | `/api/users/profile` | Delete user account | Yes |

### Product Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Get all products | No |
| GET | `/api/products/:id` | Get product by ID | No |
| POST | `/api/products` | Create product | Yes |
| PUT | `/api/products/:id` | Update product | Yes |
| DELETE | `/api/products/:id` | Delete product | Yes |
| GET | `/api/products/search` | Search products | No |
| GET | `/api/categories` | Get categories | No |

### Order Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cart` | Get user's cart | Yes |
| POST | `/api/cart/items` | Add item to cart | Yes |
| PUT | `/api/cart/items/:id` | Update cart item | Yes |
| DELETE | `/api/cart/items/:id` | Remove cart item | Yes |
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/orders` | Get user's orders | Yes |
| GET | `/api/orders/:id` | Get order details | Yes |

### Notification Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/notifications/email` | Send email | Yes |
| POST | `/api/notifications/sms` | Send SMS | Yes |
| GET | `/api/notifications/history` | Get notification history | Yes |

### Aggregated Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/dashboard` | Get user dashboard data | Yes |
| GET | `/api/search` | Global search across services | No |
| GET | `/api/health` | Health check for all services | No |

## Request/Response Examples

### User Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Global Search

```bash
GET /api/search?q=iphone&type=products&limit=10
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
        "image": "https://example.com/iphone15pro1.jpg"
      }
    ],
    "total": 1,
    "query": "iphone"
  }
}
```

### User Dashboard

```bash
GET /api/dashboard
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    },
    "recentOrders": [
      {
        "id": "507f1f77bcf86cd799439014",
        "status": "delivered",
        "totalAmount": 199998,
        "createdAt": "2024-01-10T10:30:00Z"
      }
    ],
    "cartItems": 2,
    "wishlistItems": 5,
    "notifications": [
      {
        "id": "507f1f77bcf86cd799439015",
        "type": "email",
        "subject": "Order Delivered",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 8080 |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `USER_SERVICE_URL` | User service URL | http://user-service:8081 |
| `PRODUCT_SERVICE_URL` | Product service URL | http://product-service:8082 |
| `ORDER_SERVICE_URL` | Order service URL | http://order-service:8083 |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | http://notification-service:8084 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 200 |

## Service Routing

### User Service Routes
- `/api/auth/*` → User Service
- `/api/users/*` → User Service

### Product Service Routes
- `/api/products/*` → Product Service
- `/api/categories/*` → Product Service

### Order Service Routes
- `/api/cart/*` → Order Service
- `/api/orders/*` → Order Service

### Notification Service Routes
- `/api/notifications/*` → Notification Service

### Aggregated Routes
- `/api/dashboard` → Multiple services
- `/api/search` → Product Service
- `/api/health` → All services

## Authentication Flow

1. **Client Request**: Sends request with JWT token
2. **Token Validation**: Gateway validates JWT token
3. **User Verification**: Gateway calls User Service to verify user
4. **Request Forwarding**: Gateway forwards request to appropriate service
5. **Response Aggregation**: Gateway aggregates responses if needed

## Security Features

### JWT Authentication
- Token validation on protected routes
- User verification with User Service
- Token refresh mechanism

### Rate Limiting
- Global rate limiting: 200 requests per 15 minutes
- Per-user rate limiting: 100 requests per 15 minutes
- Per-endpoint rate limiting for sensitive operations

### CORS Configuration
- Allowed origins: `http://localhost:3000`
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization

### Security Headers
- Helmet for security headers
- XSS protection
- Content Security Policy
- HSTS headers

## Health Monitoring

### Service Health Checks
```bash
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "user-service": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2024-01-15T10:29:55Z"
    },
    "product-service": {
      "status": "healthy",
      "responseTime": 32,
      "lastCheck": "2024-01-15T10:29:58Z"
    },
    "order-service": {
      "status": "healthy",
      "responseTime": 67,
      "lastCheck": "2024-01-15T10:29:52Z"
    },
    "notification-service": {
      "status": "healthy",
      "responseTime": 28,
      "lastCheck": "2024-01-15T10:29:59Z"
    }
  }
}
```

## Error Handling

### Service Unavailable
```json
{
  "error": "Service Unavailable",
  "message": "Product service is currently unavailable",
  "service": "product-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Authentication Error
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Rate Limit Exceeded
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again later.",
  "retryAfter": 900,
  "timestamp": "2024-01-15T10:30:00Z"
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
docker build -t api-gateway .

# Run container
docker run -p 8080:8080 --env-file .env api-gateway
```

## Load Balancing

The gateway supports multiple strategies:

- **Round Robin**: Distribute requests evenly
- **Least Connections**: Send to service with fewest connections
- **Health-based**: Send to healthiest service
- **Sticky Sessions**: Maintain session affinity

## Caching Strategy

- **User Data**: Cache for 5 minutes
- **Product Data**: Cache for 10 minutes
- **Search Results**: Cache for 2 minutes
- **Health Checks**: Cache for 30 seconds

## Monitoring and Logging

### Request Logging
```javascript
{
  "timestamp": "2024-01-15T10:30:00Z",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "responseTime": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100"
}
```

### Error Logging
```javascript
{
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Service Unavailable",
  "service": "product-service",
  "requestId": "req-123",
  "stack": "..."
}
```

## Performance Optimization

- Redis caching for frequently accessed data
- Connection pooling for service communication
- Request compression
- Response caching
- Load balancing across service instances

## Troubleshooting

### Common Issues

1. **Service Connection Failed**
   - Check service URLs in `.env`
   - Verify service availability
   - Check network connectivity

2. **Authentication Issues**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Review User Service connectivity

3. **High Response Times**
   - Monitor service response times
   - Check Redis connection
   - Review caching strategy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 