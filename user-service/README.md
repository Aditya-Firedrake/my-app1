# User Service

A Spring Boot microservice for user management, authentication, and authorization in the eCommerce platform.

## Features

- User registration and login
- JWT-based authentication
- User profile management
- Password encryption with BCrypt
- Session management with Redis
- Role-based access control
- Health monitoring with Spring Actuator

## Technology Stack

- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Database**: PostgreSQL
- **Cache**: Redis
- **Security**: Spring Security + JWT
- **Build Tool**: Maven
- **Container**: Docker

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- PostgreSQL
- Redis
- Docker (optional)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up user-service
```

### Manual Setup

1. **Clone and navigate to the service**
   ```bash
   cd user-service
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run the application**
   ```bash
   mvn spring-boot:run
   ```

The service will start on `http://localhost:8081`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/validate` | Validate JWT token | No |

### User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/profile` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update user profile | Yes |
| DELETE | `/api/users/profile` | Delete user account | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/actuator/health` | Service health status |

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
    "phone": "+91-9876543210",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### User Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | Application port | 8081 |
| `DB_HOST` | PostgreSQL host | postgres |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | ecommerce_users |
| `DB_USERNAME` | Database username | postgres |
| `DB_PASSWORD` | Database password | postgres123 |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRATION` | JWT expiration time (ms) | 86400000 |

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

```bash
# Run all tests
mvn test

# Run tests with coverage
mvn test jacoco:report
```

## Docker

```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 8081:8081 --env-file .env user-service
```

## Monitoring

The service includes Spring Actuator endpoints for monitoring:

- `/actuator/health` - Health check
- `/actuator/info` - Application info
- `/actuator/metrics` - Application metrics

## Security

- Passwords are encrypted using BCrypt
- JWT tokens for stateless authentication
- CORS configuration for cross-origin requests
- Rate limiting on authentication endpoints
- Input validation using Bean Validation

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify network connectivity

2. **Redis Connection Failed**
   - Ensure Redis is running
   - Check Redis configuration in `.env`

3. **JWT Token Issues**
   - Verify `JWT_SECRET` is set
   - Check token expiration time

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 