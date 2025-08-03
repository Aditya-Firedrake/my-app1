# Order Service

A Python FastAPI microservice for order management, shopping cart, and payment processing in the eCommerce platform.

## Features

- Shopping cart management
- Order placement and tracking
- Payment processing (mocked)
- Order history
- Inventory validation
- Integration with other services
- Real-time order status updates

## Technology Stack

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Cache**: Redis
- **Validation**: Pydantic
- **HTTP Client**: httpx
- **Container**: Docker

## Prerequisites

- Python 3.11 or higher
- PostgreSQL
- Redis
- Docker (optional)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up order-service
```

### Manual Setup

1. **Clone and navigate to the service**
   ```bash
   cd order-service
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8083 --reload
   ```

The service will start on `http://localhost:8083`

## API Endpoints

### Cart Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cart` | Get user's cart | Yes |
| POST | `/api/cart/items` | Add item to cart | Yes |
| PUT | `/api/cart/items/{item_id}` | Update cart item | Yes |
| DELETE | `/api/cart/items/{item_id}` | Remove item from cart | Yes |
| DELETE | `/api/cart` | Clear cart | Yes |

### Orders

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/orders` | Create order from cart | Yes |
| GET | `/api/orders` | Get user's orders | Yes |
| GET | `/api/orders/{order_id}` | Get order details | Yes |
| PUT | `/api/orders/{order_id}/status` | Update order status | Yes |
| GET | `/api/orders/{order_id}/tracking` | Get order tracking | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |

## Request/Response Examples

### Add Item to Cart

```bash
POST /api/cart/items
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "productId": "507f1f77bcf86cd799439012",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "productId": "507f1f77bcf86cd799439012",
    "productName": "iPhone 15 Pro",
    "price": 99999,
    "quantity": 2,
    "totalPrice": 199998,
    "image": "https://example.com/iphone15pro1.jpg"
  }
}
```

### Create Order

```bash
POST /api/orders
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  },
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "**** **** **** 1234",
    "expiryDate": "12/25"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "userId": 1,
    "status": "pending",
    "totalAmount": 199998,
    "items": [
      {
        "productId": "507f1f77bcf86cd799439012",
        "productName": "iPhone 15 Pro",
        "price": 99999,
        "quantity": 2,
        "totalPrice": 199998
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    },
    "paymentMethod": "credit_card",
    "createdAt": "2024-01-15T10:30:00Z",
    "estimatedDelivery": "2024-01-20T10:30:00Z"
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 8083 |
| `DATABASE_URL` | PostgreSQL connection string | postgresql://postgres:postgres123@postgres:5432/ecommerce_orders |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `USER_SERVICE_URL` | User service URL | http://user-service:8081 |
| `PRODUCT_SERVICE_URL` | Product service URL | http://product-service:8082 |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | http://notification-service:8084 |
| `JWT_SECRET` | JWT signing secret | - |

## Database Schema

### Orders Table

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    estimated_delivery TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table

```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cart Table

```sql
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cart Items Table

```sql
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES cart(id),
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_orders.py

# Run tests in verbose mode
pytest -v
```

## Docker

```bash
# Build image
docker build -t order-service .

# Run container
docker run -p 8083:8083 --env-file .env order-service
```

## Service Integration

The Order Service integrates with other microservices:

### User Service Integration
- Validates user authentication
- Retrieves user profile information
- Manages user-specific data

### Product Service Integration
- Validates product availability
- Retrieves product details and pricing
- Updates product inventory

### Notification Service Integration
- Sends order confirmation emails
- Sends shipping updates
- Sends payment confirmations

## Payment Processing

The service includes a mocked payment processing system:

- **Credit Card**: Simulated payment gateway
- **UPI**: Indian payment method simulation
- **Net Banking**: Bank transfer simulation
- **Cash on Delivery**: COD option

## Order Status Flow

1. **Pending**: Order created, awaiting payment
2. **Paid**: Payment confirmed
3. **Processing**: Order being prepared
4. **Shipped**: Order dispatched
5. **Delivered**: Order completed
6. **Cancelled**: Order cancelled

## Error Handling

The service implements comprehensive error handling:

- **Validation Errors**: Invalid input data
- **Business Logic Errors**: Insufficient stock, invalid user
- **External Service Errors**: Service unavailability
- **Database Errors**: Connection issues

## Performance Optimization

- Redis caching for frequently accessed data
- Database connection pooling
- Asynchronous external service calls
- Efficient database queries with proper indexing

## Security

- JWT token validation
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- CORS configuration
- Rate limiting

## Monitoring

- Health check endpoints
- Request/response logging
- Error tracking
- Performance metrics

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify network connectivity

2. **External Service Errors**
   - Check service URLs in `.env`
   - Verify service availability
   - Check network connectivity

3. **Payment Processing Issues**
   - Verify payment gateway configuration
   - Check payment method validation
   - Review error logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 