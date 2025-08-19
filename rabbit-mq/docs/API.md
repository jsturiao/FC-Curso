# 📡 API Documentation - E-commerce RabbitMQ

Documentação completa das APIs REST disponíveis no sistema e-commerce modular.

## 📋 Índice

- [🏥 System APIs](#-system-apis)
- [📦 Orders API](#-orders-api)
- [💳 Payments API](#-payments-api)
- [📦 Inventory API](#-inventory-api)
- [📧 Notifications API](#-notifications-api)
- [🚨 DLQ Management API](#-dlq-management-api)
- [📊 Response Formats](#-response-formats)
- [❌ Error Handling](#-error-handling)
- [🔐 Authentication](#-authentication)

## 🏥 System APIs

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-19T19:32:05.657Z",
  "uptime": 26.872684979,
  "environment": "development"
}
```

### General Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 15,
      "pending": 3,
      "completed": 12
    },
    "payments": {
      "total": 12,
      "successful": 10,
      "failed": 2
    },
    "inventory": {
      "products": 50,
      "totalStock": 1250,
      "reserved": 25
    },
    "notifications": {
      "sent": 45,
      "pending": 2
    }
  }
}
```

---

## 📦 Orders API

### Create Order
```http
POST /api/orders
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "customer123",
  "items": [
    {
      "productId": "prod1",
      "quantity": 2,
      "price": 29.99
    },
    {
      "productId": "prod2", 
      "quantity": 1,
      "price": 15.50
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "order_67890",
    "customerId": "customer123",
    "items": [
      {
        "productId": "prod1",
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "total": 75.48,
    "status": "pending",
    "createdAt": "2025-08-19T19:30:00.000Z"
  }
}
```

### Get Orders
```http
GET /api/orders
GET /api/orders?status=pending&limit=10&offset=0
```

**Query Parameters:**
- `status` (optional): pending, processing, completed, cancelled
- `customerId` (optional): Filter by customer
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_67890",
      "customerId": "customer123",
      "status": "completed",
      "total": 75.48,
      "createdAt": "2025-08-19T19:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get Order by ID
```http
GET /api/orders/{orderId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_67890",
    "customerId": "customer123",
    "items": [...],
    "total": 75.48,
    "status": "completed",
    "events": [
      {
        "type": "order.created",
        "timestamp": "2025-08-19T19:30:00.000Z"
      },
      {
        "type": "payment.processed",
        "timestamp": "2025-08-19T19:30:15.000Z"
      }
    ],
    "createdAt": "2025-08-19T19:30:00.000Z",
    "updatedAt": "2025-08-19T19:30:20.000Z"
  }
}
```

### Update Order Status
```http
PUT /api/orders/{orderId}/status
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "cancelled",
  "reason": "Customer request"
}
```

### Orders Statistics
```http
GET /api/orders/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "byStatus": {
      "pending": 3,
      "processing": 2,
      "completed": 8,
      "cancelled": 2
    },
    "revenueTotal": 1250.75,
    "averageOrderValue": 83.38,
    "ordersToday": 5
  }
}
```

---

## 💳 Payments API

### Process Payment
```http
POST /api/payments
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order_67890",
  "amount": 75.48,
  "paymentMethod": "credit_card",
  "cardDetails": {
    "number": "****-****-****-1234",
    "expiryMonth": 12,
    "expiryYear": 2026
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "payment_12345",
    "orderId": "order_67890",
    "amount": 75.48,
    "status": "processed",
    "paymentMethod": "credit_card",
    "transactionId": "txn_abc123",
    "processedAt": "2025-08-19T19:30:15.000Z"
  }
}
```

### Get Payment by ID
```http
GET /api/payments/{paymentId}
```

### Get Payments by Order
```http
GET /api/payments/order/{orderId}
```

### Payments Statistics
```http
GET /api/payments/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "successful": 10,
    "failed": 2,
    "totalAmount": 1125.50,
    "averageAmount": 93.79,
    "byMethod": {
      "credit_card": 8,
      "debit_card": 2,
      "pix": 2
    }
  }
}
```

---

## 📦 Inventory API

### Get Products
```http
GET /api/inventory
GET /api/inventory?category=electronics&inStock=true
```

**Query Parameters:**
- `category` (optional): Filter by category
- `inStock` (optional): true/false
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod1",
      "name": "Wireless Headphones",
      "category": "electronics",
      "price": 29.99,
      "stock": 25,
      "reserved": 5,
      "available": 20
    }
  ]
}
```

### Get Product by ID
```http
GET /api/inventory/{productId}
```

### Reserve Stock
```http
POST /api/inventory/{productId}/reserve
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 2,
  "orderId": "order_67890",
  "reservationTTL": 300000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "res_abc123",
    "productId": "prod1",
    "quantity": 2,
    "orderId": "order_67890",
    "expiresAt": "2025-08-19T19:35:00.000Z"
  }
}
```

### Release Stock
```http
POST /api/inventory/{productId}/release
Content-Type: application/json
```

**Request Body:**
```json
{
  "reservationId": "res_abc123",
  "quantity": 2
}
```

### Inventory Statistics
```http
GET /api/inventory/stats
```

---

## 📧 Notifications API

### Get Notifications
```http
GET /api/notifications
GET /api/notifications?type=email&status=sent
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "email",
      "recipient": "customer@example.com",
      "subject": "Order Confirmation",
      "status": "sent",
      "sentAt": "2025-08-19T19:30:30.000Z"
    }
  ]
}
```

### Get Notification by ID
```http
GET /api/notifications/{notificationId}
```

### Notifications Statistics
```http
GET /api/notifications/stats
```

---

## 🚨 DLQ Management API

### DLQ Statistics
```http
GET /api/dlq/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dlq": {
      "total": 3,
      "byStatus": {
        "failed": 2,
        "reprocessing": 1
      },
      "byQueue": {
        "orders.created": 1,
        "payments.process": 2
      },
      "recentErrors": 3
    },
    "retry": {
      "activeRetries": 1,
      "retryDetails": [
        {
          "messageId": "msg_123",
          "attempt": 2,
          "nextRetry": "2025-08-19T19:32:00.000Z"
        }
      ]
    }
  }
}
```

### Get DLQ Messages
```http
GET /api/dlq/messages
GET /api/dlq/messages?status=failed&originalQueue=payments.process&limit=25
```

**Query Parameters:**
- `status`: failed, reprocessing, reprocessed, reprocess_failed
- `originalQueue`: Name of the original queue
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dlq_msg_123",
      "originalQueue": "payments.process",
      "eventType": "payment.process",
      "error": "Payment gateway timeout",
      "status": "failed",
      "retryCount": 3,
      "maxRetries": 3,
      "timestamp": "2025-08-19T19:25:00.000Z",
      "originalMessage": {
        "orderId": "order_67890",
        "amount": 75.48
      }
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Reprocess DLQ Message
```http
POST /api/dlq/reprocess/{messageId}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent for reprocessing",
  "data": {
    "messageId": "dlq_msg_123",
    "status": "reprocessing",
    "reprocessedAt": "2025-08-19T19:35:00.000Z"
  }
}
```

### Delete DLQ Message
```http
DELETE /api/dlq/messages/{messageId}
```

### Bulk Reprocess
```http
POST /api/dlq/bulk/reprocess
Content-Type: application/json
```

**Request Body:**
```json
{
  "messageIds": ["dlq_msg_123", "dlq_msg_456"]
}
```

### Bulk Delete
```http
POST /api/dlq/bulk/delete
Content-Type: application/json
```

**Request Body:**
```json
{
  "messageIds": ["dlq_msg_123", "dlq_msg_456"]
}
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }, // When applicable
  "timestamp": "2025-08-19T19:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "customerId",
      "issue": "Required field missing"
    }
  },
  "timestamp": "2025-08-19T19:30:00.000Z"
}
```

### Pagination Format
```json
{
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true,
    "nextOffset": 50
  }
}
```

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Invalid request data |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business logic conflict |
| 422 | Unprocessable Entity | Validation errors |
| 500 | Internal Server Error | Server errors |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `INSUFFICIENT_STOCK` | Not enough inventory |
| `PAYMENT_FAILED` | Payment processing failed |
| `DUPLICATE_ORDER` | Order already exists |
| `PROCESSING_ERROR` | Internal processing error |

---

## 🔐 Authentication

**Current Status**: No authentication required (development mode)

**Production Recommendations**:
- JWT tokens for API access
- API keys for service-to-service communication
- Rate limiting
- CORS configuration

---

## 🧪 Testing Examples

### Using cURL

```bash
# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer123",
    "items": [
      {"productId": "prod1", "quantity": 2, "price": 29.99}
    ]
  }'

# Get order status
curl http://localhost:3000/api/orders/order_67890

# Check DLQ stats
curl http://localhost:3000/api/dlq/stats
```

### Using JavaScript (fetch)

```javascript
// Create order
const response = await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'customer123',
    items: [
      { productId: 'prod1', quantity: 2, price: 29.99 }
    ]
  })
});

const order = await response.json();
console.log(order);
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Monetary values are in decimal format (e.g., 29.99)
- IDs are generated using UUID v4
- API responses include request tracing for debugging
- Pagination is 0-based offset
- All APIs support JSON only (no XML)

---

**📅 Last Updated**: August 19, 2025  
**🔄 API Version**: 1.0.0
