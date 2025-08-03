# Notification Service

A Node.js Express microservice for sending email, SMS, and push notifications in the eCommerce platform.

## Features

- Email notifications (order confirmations, shipping updates)
- SMS notifications (delivery updates, OTP)
- Push notifications (mobile app)
- Notification templates
- Notification history tracking
- Queue-based processing with BullMQ
- Rate limiting and delivery tracking

## Technology Stack

- **Framework**: Express.js
- **Language**: Node.js
- **Queue**: BullMQ + Redis
- **Email**: Nodemailer
- **SMS**: Twilio (mocked)
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Container**: Docker

## Prerequisites

- Node.js 18 or higher
- Redis
- SMTP server (Gmail, SendGrid, etc.)
- Twilio account (for SMS)
- Docker (optional)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up notification-service
```

### Manual Setup

1. **Clone and navigate to the service**
   ```bash
   cd notification-service
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

The service will start on `http://localhost:8084`

## API Endpoints

### Email Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/notifications/email` | Send email notification | Yes |
| GET | `/api/notifications/email/history` | Get email history | Yes |
| GET | `/api/notifications/email/{id}` | Get email details | Yes |

### SMS Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/notifications/sms` | Send SMS notification | Yes |
| GET | `/api/notifications/sms/history` | Get SMS history | Yes |
| GET | `/api/notifications/sms/{id}` | Get SMS details | Yes |

### Push Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/notifications/push` | Send push notification | Yes |
| GET | `/api/notifications/push/history` | Get push history | Yes |

### Templates

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications/templates` | Get all templates | Yes |
| POST | `/api/notifications/templates` | Create template | Yes |
| PUT | `/api/notifications/templates/{id}` | Update template | Yes |
| DELETE | `/api/notifications/templates/{id}` | Delete template | Yes |

## Request/Response Examples

### Send Email Notification

```bash
POST /api/notifications/email
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "to": "customer@example.com",
  "subject": "Order Confirmation",
  "template": "order_confirmation",
  "data": {
    "orderId": "507f1f77bcf86cd799439014",
    "customerName": "John Doe",
    "totalAmount": 199998,
    "estimatedDelivery": "2024-01-20"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email notification sent successfully",
  "data": {
    "id": "507f1f77bcf86cd799439015",
    "type": "email",
    "to": "customer@example.com",
    "subject": "Order Confirmation",
    "status": "queued",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Send SMS Notification

```bash
POST /api/notifications/sms
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "to": "+91-9876543210",
  "message": "Your order #507f1f77bcf86cd799439014 has been shipped. Track at: https://track.example.com",
  "template": "order_shipped"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS notification sent successfully",
  "data": {
    "id": "507f1f77bcf86cd799439016",
    "type": "sms",
    "to": "+91-9876543210",
    "status": "sent",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 8084 |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USER` | SMTP username | - |
| `EMAIL_PASSWORD` | SMTP password | - |
| `EMAIL_FROM` | From email address | noreply@ecommerce.com |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | - |
| `JWT_SECRET` | JWT signing secret | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 50 |

## Notification Templates

### Email Templates

#### Order Confirmation
```html
<h2>Order Confirmation</h2>
<p>Dear {{customerName}},</p>
<p>Thank you for your order! Your order #{{orderId}} has been confirmed.</p>
<p>Total Amount: ₹{{totalAmount}}</p>
<p>Estimated Delivery: {{estimatedDelivery}}</p>
```

#### Order Shipped
```html
<h2>Order Shipped</h2>
<p>Dear {{customerName}},</p>
<p>Your order #{{orderId}} has been shipped!</p>
<p>Track your order: <a href="{{trackingUrl}}">Click here</a></p>
```

### SMS Templates

#### Order Confirmation
```
Your order #{{orderId}} has been confirmed. Amount: ₹{{totalAmount}}. Delivery: {{estimatedDelivery}}
```

#### Order Shipped
```
Your order #{{orderId}} has been shipped! Track at: {{trackingUrl}}
```

## Queue Processing

The service uses BullMQ for reliable notification processing:

### Queue Configuration
- **Queue Name**: notifications
- **Concurrency**: 5 workers
- **Retry Attempts**: 3
- **Retry Delay**: 5000ms

### Queue Types
1. **Email Queue**: Processes email notifications
2. **SMS Queue**: Processes SMS notifications
3. **Push Queue**: Processes push notifications

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
docker build -t notification-service .

# Run container
docker run -p 8084:8084 --env-file .env notification-service
```

## Email Configuration

### Gmail Setup
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### SendGrid Setup
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

## SMS Configuration

### Twilio Setup
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Notification Types

### Order Notifications
- Order confirmation
- Payment confirmation
- Order shipped
- Order delivered
- Order cancelled

### User Notifications
- Welcome email
- Password reset
- Account verification
- Profile updates

### Marketing Notifications
- Promotional emails
- Flash sales
- New product announcements
- Loyalty rewards

## Delivery Tracking

The service tracks notification delivery:

- **Queued**: Notification added to queue
- **Processing**: Notification being sent
- **Sent**: Notification delivered successfully
- **Failed**: Notification delivery failed
- **Bounced**: Email bounced back

## Rate Limiting

- **Email**: 100 emails per hour per user
- **SMS**: 10 SMS per hour per user
- **Push**: 50 push notifications per hour per user

## Error Handling

- **SMTP Errors**: Retry with exponential backoff
- **SMS Errors**: Retry with different providers
- **Template Errors**: Fallback to default templates
- **Queue Errors**: Dead letter queue for failed notifications

## Performance Optimization

- Redis caching for templates
- Queue-based processing for scalability
- Connection pooling for external services
- Template compilation and caching

## Security

- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration
- Helmet for security headers
- JWT authentication for protected endpoints

## Monitoring

- Queue monitoring with BullMQ
- Delivery success/failure rates
- Response time metrics
- Error tracking and alerting

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP credentials
   - Verify email server settings
   - Check spam folder

2. **SMS Not Sending**
   - Verify Twilio credentials
   - Check phone number format
   - Review Twilio logs

3. **Queue Processing Issues**
   - Check Redis connection
   - Monitor queue workers
   - Review error logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 