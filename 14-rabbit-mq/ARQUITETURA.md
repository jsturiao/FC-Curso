# 🏗️ Arquitetura do Sistema E-commerce com RabbitMQ

## 📋 Visão Geral

Este documento detalha a arquitetura completa de um sistema de e-commerce distribuído utilizando RabbitMQ para comunicação assíncrona entre microsserviços. O sistema implementa padrões de Event-Driven Architecture (EDA) e CQRS para garantir escalabilidade, resiliência e manutenibilidade.

## 🎯 Objetivos do Sistema

- **Escalabilidade**: Cada módulo pode ser escalado independentemente
- **Resiliência**: Sistema continua funcionando mesmo com falhas em módulos específicos  
- **Observabilidade**: Dashboard em tempo real para monitoramento de eventos
- **Manutenibilidade**: Código modular e bem organizado
- **Performance**: Processamento assíncrono para operações não-críticas

---

## 🏛️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🌐 FRONTEND DASHBOARD                             │
│                        http://localhost:3000                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 Real-time Message Flow  │  🧪 API Testing  │  📈 System Statistics    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   WebSocket │ Socket.IO
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🚀 APLICAÇÃO PRINCIPAL                            │
│                         Node.js + Express                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   📦 Orders │  │ 💳 Payments │  │📋 Inventory │  │📬 Notifications│     │
│  │   Module    │  │   Module    │  │   Module    │  │    Module     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    🔄 EVENT BUS                                     │   │
│  │              Centralized Event Management                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  📊 MESSAGE LOGGER                                  │   │
│  │            Event Persistence & Monitoring                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ⚠️ DLQ MANAGER                                   │   │
│  │               Dead Letter Queue Management                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   Events │ AMQP
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🐰 RABBITMQ BROKER                                │
│                        Message Broker Layer                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│  │ 🔄 ecommerce.   │  │ 📬 ecommerce.   │  │ ⚠️ ecommerce.    │          │
│  │    events       │  │  notifications  │  │   deadletter    │           │
│  │   Exchange      │  │    Exchange     │  │    Exchange     │           │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MESSAGE QUEUES                               │   │
│  │  • orders.events.queue        • inventory.events.queue             │   │
│  │  • payments.events.queue      • notifications.events.queue         │   │
│  │  • dlq.*.failed               • retry.*.queue                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   Data │ MongoDB
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🗄️ MONGODB DATABASE                               │
│                         Data Persistence Layer                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Orders    │  │  Payments   │  │  Products   │  │   Messages  │       │
│  │ Collection  │  │ Collection  │  │ Collection  │  │  Collection │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Inventory   │  │ Notifications│ │    DLQ      │  │   Retries   │       │
│  │ Collection  │  │  Collection │  │ Collection  │  │ Collection  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Principais

### 1. **Frontend Dashboard** 🌐
- **Tecnologia**: HTML5 + JavaScript + Socket.IO
- **Funcionalidades**:
  - Visualização em tempo real do fluxo de mensagens
  - Interface de teste para todas as APIs
  - Estatísticas do sistema em tempo real
  - Monitoramento de status dos serviços

### 2. **Aplicação Principal** 🚀
- **Tecnologia**: Node.js + Express.js
- **Responsabilidades**:
  - Orchestração de módulos
  - Gerenciamento de rotas API
  - WebSocket para comunicação em tempo real
  - Health checks e monitoramento

### 3. **RabbitMQ Broker** 🐰
- **Tecnologia**: RabbitMQ 3.12 com Management Plugin
- **Configuração**:
  - **Host**: localhost:5672 (AMQP)
  - **Management**: localhost:15672
  - **Virtual Host**: ecommerce
  - **Credenciais**: admin/admin123

### 4. **Banco de Dados** 🗄️
- **Tecnologia**: MongoDB 7.0
- **Configuração**:
  - **Host**: localhost:27017
  - **Database**: ecommerce
  - **Credenciais**: admin/admin123

---

## 📦 Módulos do Sistema

### 1. **Orders Module** 📦

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              📦 ORDERS MODULE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📁 Structure:                                                              │
│  ├── controller.js     → API endpoints & business logic                    │
│  ├── model.js          → MongoDB schema & data validation                  │
│  ├── routes.js         → Express routes definition                         │
│  ├── index.js          → Module initialization & exports                   │
│  └── events/           → Event handling                                    │
│      ├── publisher.js  → Publishes order events                           │
│      └── subscriber.js → Listens to payment/inventory events              │
│                                                                             │
│  🔄 Events Published:                                                       │
│  • ORDER_CREATED       → New order created                                 │
│  • ORDER_UPDATED       → Order status changed                              │
│  • ORDER_CANCELLED     → Order was cancelled                               │
│  • ORDER_CONFIRMED     → Order confirmed after payment                     │
│                                                                             │
│  📨 Events Consumed:                                                        │
│  • PAYMENT_SUCCEEDED   → Update order status to paid                       │
│  • PAYMENT_FAILED      → Update order status to failed                     │
│  • INVENTORY_RESERVED  → Confirm inventory availability                     │
│                                                                             │
│  🛠️ API Endpoints:                                                          │
│  • POST   /api/orders              → Create new order                      │
│  • GET    /api/orders              → List all orders                       │
│  • GET    /api/orders/:id          → Get specific order                    │
│  • PUT    /api/orders/:id/status   → Update order status                   │
│  • DELETE /api/orders/:id          → Cancel order                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. **Payments Module** 💳

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             💳 PAYMENTS MODULE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📁 Structure:                                                              │
│  ├── controller.js     → Payment processing logic                          │
│  ├── model.js          → Payment data models                               │
│  ├── routes.js         → Payment API routes                                │
│  ├── index.js          → Module setup                                      │
│  └── events/           → Event management                                  │
│      ├── publisher.js  → Payment event publishing                          │
│      └── subscriber.js → Order event consumption                           │
│                                                                             │
│  🔄 Events Published:                                                       │
│  • PAYMENT_REQUESTED   → Payment process initiated                         │
│  • PAYMENT_PROCESSING  → Payment being processed                           │
│  • PAYMENT_SUCCEEDED   → Payment completed successfully                     │
│  • PAYMENT_FAILED      → Payment processing failed                         │
│  • PAYMENT_REFUNDED    → Payment was refunded                              │
│                                                                             │
│  📨 Events Consumed:                                                        │
│  • ORDER_CREATED       → Initiate payment process                          │
│  • ORDER_CANCELLED     → Cancel pending payments                           │
│                                                                             │
│  🛠️ API Endpoints:                                                          │
│  • POST /api/payments/process       → Process payment                      │
│  • PUT  /api/payments/:id/status    → Update payment status                │
│  • GET  /api/payments               → List payments                        │
│  • GET  /api/payments/:id           → Get payment details                  │
│  • POST /api/payments/:id/refund    → Process refund                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. **Inventory Module** 📋

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            📋 INVENTORY MODULE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📁 Structure:                                                              │
│  ├── controller.js     → Inventory management logic                        │
│  ├── model.js          → Product & stock models                            │
│  ├── routes.js         → Inventory API routes                              │
│  ├── service.js        → Business logic layer                              │
│  ├── index.js          → Module initialization                             │
│  └── events/           → Event processing                                  │
│      ├── publisher.js  → Stock event publishing                            │
│      └── subscriber.js → Order event handling                              │
│                                                                             │
│  🔄 Events Published:                                                       │
│  • INVENTORY_UPDATED   → Stock levels changed                              │
│  • INVENTORY_RESERVED  → Stock reserved for order                          │
│  • INVENTORY_RELEASED  → Reserved stock released                           │
│  • LOW_STOCK_ALERT     → Stock below minimum threshold                     │
│  • INVENTORY_ERROR     → Stock operation failed                            │
│                                                                             │
│  📨 Events Consumed:                                                        │
│  • ORDER_CREATED       → Reserve stock for order                           │
│  • ORDER_CANCELLED     → Release reserved stock                            │
│  • PAYMENT_FAILED      → Release reserved stock                            │
│                                                                             │
│  🛠️ API Endpoints:                                                          │
│  • GET  /api/inventory/products         → List all products                │
│  • POST /api/inventory/products         → Create new product               │
│  • PUT  /api/inventory/products/:id     → Update product                   │
│  • POST /api/inventory/stock/add        → Add stock                        │
│  • POST /api/inventory/stock/reserve    → Reserve stock                    │
│  • GET  /api/inventory/stats            → Inventory statistics             │
│  • GET  /api/inventory/low-stock        → Low stock alerts                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. **Notifications Module** 📬

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           📬 NOTIFICATIONS MODULE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📁 Structure:                                                              │
│  ├── controller.js     → Notification dispatch logic                       │
│  ├── routes.js         → Notification API routes                           │
│  ├── index.js          → Module configuration                              │
│  ├── events/           → Event subscription                                │
│  │   └── subscriber.js → Listen to all system events                      │
│  ├── services/         → Notification channels                             │
│  │   ├── emailService.js      → Email notifications                       │
│  │   ├── smsService.js        → SMS notifications                         │
│  │   └── pushNotificationService.js → Push notifications                  │
│  └── templates/        → Notification templates                            │
│      ├── order-confirmation.html                                           │
│      ├── payment-receipt.html                                              │
│      └── stock-alert.html                                                  │
│                                                                             │
│  🔄 Events Published:                                                       │
│  • NOTIFICATION_EMAIL_SENT → Email notification sent                       │
│  • NOTIFICATION_SMS_SENT   → SMS notification sent                         │
│  • NOTIFICATION_PUSH_SENT  → Push notification sent                        │
│  • NOTIFICATION_FAILED     → Notification delivery failed                  │
│                                                                             │
│  📨 Events Consumed:                                                        │
│  • ORDER_CREATED       → Send order confirmation                           │
│  • PAYMENT_SUCCEEDED   → Send payment receipt                              │
│  • LOW_STOCK_ALERT     → Notify inventory managers                         │
│  • All system events   → Contextual notifications                          │
│                                                                             │
│  🛠️ API Endpoints:                                                          │
│  • POST /api/notifications/email → Send email notification                 │
│  • POST /api/notifications/sms   → Send SMS notification                   │
│  • POST /api/notifications/push  → Send push notification                  │
│  • GET  /api/notifications       → List notification history               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Eventos Detalhado

### 1. **Fluxo de Criação de Pedido** 🛒

```mermaid
sequenceDiagram
    participant C as Cliente/Dashboard
    participant O as Orders Module
    participant EB as EventBus
    participant R as RabbitMQ
    participant I as Inventory Module
    participant P as Payments Module
    participant N as Notifications Module
    participant DB as MongoDB

    C->>O: POST /api/orders (criar pedido)
    O->>DB: Salvar pedido (status: pending)
    O->>EB: Publish ORDER_CREATED
    EB->>R: Send to ecommerce.events
    
    R->>I: Consume ORDER_CREATED
    I->>DB: Verificar disponibilidade
    I->>EB: Publish INVENTORY_RESERVED
    EB->>R: Send to ecommerce.events
    
    R->>P: Consume ORDER_CREATED
    P->>EB: Publish PAYMENT_REQUESTED
    EB->>R: Send to ecommerce.events
    
    R->>N: Consume ORDER_CREATED
    N->>C: Send confirmation email
    N->>EB: Publish NOTIFICATION_EMAIL_SENT
    
    Note over C,DB: Todos os eventos são logados e<br/>transmitidos via WebSocket para o Dashboard
```

### 2. **Fluxo de Processamento de Pagamento** 💳

```mermaid
sequenceDiagram
    participant C as Cliente/Dashboard
    participant P as Payments Module
    participant EB as EventBus
    participant R as RabbitMQ
    participant O as Orders Module
    participant I as Inventory Module
    participant N as Notifications Module
    participant DB as MongoDB

    C->>P: POST /api/payments/process
    P->>DB: Salvar payment (status: processing)
    P->>EB: Publish PAYMENT_PROCESSING
    EB->>R: Send to ecommerce.events
    
    Note over P: Simular processamento<br/>do pagamento
    
    alt Pagamento Aprovado
        P->>DB: Update payment (status: succeeded)
        P->>EB: Publish PAYMENT_SUCCEEDED
        EB->>R: Send to ecommerce.events
        
        R->>O: Consume PAYMENT_SUCCEEDED
        O->>DB: Update order (status: paid)
        O->>EB: Publish ORDER_UPDATED
        
        R->>I: Consume PAYMENT_SUCCEEDED
        I->>DB: Confirmar reserva de estoque
        I->>EB: Publish INVENTORY_CONFIRMED
        
        R->>N: Consume PAYMENT_SUCCEEDED
        N->>C: Send payment receipt
        
    else Pagamento Rejeitado
        P->>DB: Update payment (status: failed)
        P->>EB: Publish PAYMENT_FAILED
        EB->>R: Send to ecommerce.events
        
        R->>O: Consume PAYMENT_FAILED
        O->>DB: Update order (status: failed)
        
        R->>I: Consume PAYMENT_FAILED
        I->>DB: Liberar estoque reservado
        I->>EB: Publish INVENTORY_RELEASED
        
        R->>N: Consume PAYMENT_FAILED
        N->>C: Send failure notification
    end
```

### 3. **Fluxo de Gerenciamento de Estoque** 📦

```mermaid
sequenceDiagram
    participant C as Cliente/Dashboard
    participant I as Inventory Module
    participant EB as EventBus
    participant R as RabbitMQ
    participant N as Notifications Module
    participant ML as MessageLogger
    participant WS as WebSocket
    participant DB as MongoDB

    C->>I: POST /api/inventory/stock/add
    I->>DB: Atualizar quantidade em estoque
    I->>EB: Publish INVENTORY_UPDATED
    EB->>R: Send to ecommerce.events
    EB->>ML: Log message
    ML->>DB: Salvar log da mensagem
    ML->>WS: Emit 'inventory_updated'
    WS->>C: Real-time update no dashboard
    
    Note over I,DB: Verificar se estoque<br/>está abaixo do mínimo
    
    alt Estoque Baixo
        I->>EB: Publish LOW_STOCK_ALERT
        EB->>R: Send to ecommerce.events
        
        R->>N: Consume LOW_STOCK_ALERT
        N->>C: Send alert notification
        N->>EB: Publish NOTIFICATION_EMAIL_SENT
    end
    
    C->>I: POST /api/inventory/stock/reserve
    I->>DB: Reservar quantidade
    I->>EB: Publish INVENTORY_RESERVED
    EB->>R: Send to ecommerce.events
    EB->>ML: Log message
    ML->>DB: Salvar log da reserva
    ML->>WS: Emit 'inventory_updated'
    WS->>C: Real-time update no dashboard
```

---

## 🛡️ Componentes de Infraestrutura

### 1. **EventBus** 🔄

```javascript
// Centraliza toda a comunicação entre módulos
class EventBus {
  async publishEvent(eventType, data, metadata) {
    // 1. Validar evento
    // 2. Publicar no RabbitMQ
    // 3. Logar evento
    // 4. Emitir via WebSocket
  }
  
  async subscribeToEvent(eventType, handler) {
    // 1. Criar queue no RabbitMQ
    // 2. Bind queue ao exchange
    // 3. Registrar consumer
  }
}
```

**Responsabilidades**:
- Publicação centralizada de eventos
- Gerenciamento de exchanges e queues
- Validação de schema de eventos
- Retry logic para falhas
- Dead Letter Queue management

### 2. **MessageLogger** 📊

```javascript
// Persiste e monitora todos os eventos do sistema
class MessageLogger {
  async logMessage(eventType, data, metadata) {
    // 1. Validar e enricher dados
    // 2. Salvar no MongoDB
    // 3. Emitir via WebSocket para dashboard
    // 4. Atualizar estatísticas
  }
  
  getStats() {
    // Retorna estatísticas de eventos
  }
}
```

**Responsabilidades**:
- Auditoria completa de eventos
- Estatísticas em tempo real
- Dashboard de monitoramento
- Debugging e troubleshooting
- Performance metrics

### 3. **DLQ Manager** ⚠️

```javascript
// Gerencia mensagens que falharam no processamento
class DLQManager {
  async processFailedMessage(message) {
    // 1. Analisar tipo de falha
    // 2. Aplicar retry strategy
    // 3. Mover para DLQ se necessário
    // 4. Alertar administradores
  }
  
  async retryMessage(messageId) {
    // Reprocessar mensagem específica
  }
}
```

**Responsabilidades**:
- Tratamento de mensagens falhadas
- Estratégias de retry automático
- Alertas para administradores
- Interface para reprocessamento manual
- Análise de padrões de falha

---

## 🌐 RabbitMQ Configuration

### **Exchanges** 🔄

```yaml
ecommerce.events:
  type: topic
  durable: true
  routing_patterns:
    - "order.*"      # order.created, order.updated, etc.
    - "payment.*"    # payment.succeeded, payment.failed, etc.
    - "inventory.*"  # inventory.updated, inventory.reserved, etc.
    - "notification.*" # notification.sent, notification.failed, etc.

ecommerce.notifications:
  type: fanout
  durable: true
  description: "Broadcast notifications to all interested consumers"

ecommerce.deadletter:
  type: direct
  durable: true
  description: "Dead letter exchange for failed messages"
```

### **Queues** 📮

```yaml
orders.events.queue:
  bindings:
    - exchange: ecommerce.events
      routing_key: "payment.*"
    - exchange: ecommerce.events
      routing_key: "inventory.*"

payments.events.queue:
  bindings:
    - exchange: ecommerce.events
      routing_key: "order.created"

inventory.events.queue:
  bindings:
    - exchange: ecommerce.events
      routing_key: "order.*"
    - exchange: ecommerce.events
      routing_key: "payment.*"

notifications.events.queue:
  bindings:
    - exchange: ecommerce.notifications
      routing_key: "*"

# Dead Letter Queues
dlq.orders.created.failed:
  x-message-ttl: 86400000  # 24 hours
  x-dead-letter-exchange: ecommerce.deadletter

dlq.payments.process.failed:
  x-message-ttl: 86400000

dlq.inventory.reserve.failed:
  x-message-ttl: 86400000

dlq.notifications.send.failed:
  x-message-ttl: 86400000
```

---

## 🗄️ Estrutura do Banco de Dados

### **MongoDB Collections** 📊

```javascript
// Orders Collection
{
  _id: ObjectId,
  orderId: String,
  customerId: String,
  status: String, // pending, paid, shipped, delivered, cancelled
  items: [
    {
      productId: String,
      quantity: Number,
      price: Number,
      total: Number
    }
  ],
  totalAmount: Number,
  createdAt: Date,
  updatedAt: Date,
  metadata: {
    source: String,
    correlationId: String
  }
}

// Payments Collection
{
  _id: ObjectId,
  paymentId: String,
  orderId: String,
  amount: Number,
  status: String, // requested, processing, succeeded, failed, refunded
  method: String, // credit_card, debit_card, pix, boleto
  transactionId: String,
  createdAt: Date,
  processedAt: Date,
  metadata: Object
}

// Products Collection (Inventory)
{
  _id: ObjectId,
  productId: String,
  name: String,
  description: String,
  price: Number,
  stock: Number,
  reserved: Number,
  available: Number, // stock - reserved
  minStock: Number,
  category: String,
  sku: String,
  createdAt: Date,
  updatedAt: Date
}

// Messages Collection (Event Log)
{
  _id: ObjectId,
  messageId: String,
  eventType: String,
  exchange: String,
  routingKey: String,
  data: Object,
  metadata: {
    source: String,
    correlationId: String,
    timestamp: Date,
    retryCount: Number
  },
  status: String, // published, consumed, failed
  createdAt: Date
}

// Notifications Collection
{
  _id: ObjectId,
  notificationId: String,
  type: String, // email, sms, push
  recipient: String,
  subject: String,
  content: String,
  status: String, // sent, failed, pending
  eventTrigger: String,
  sentAt: Date,
  metadata: Object
}
```

---

## 🚀 Docker & Deployment

### **Docker Compose Services** 🐳

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
      RABBITMQ_DEFAULT_VHOST: ecommerce
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 30s
      retries: 3

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 3

  ecommerce-app:
    build: ./ecommerce-app
    ports:
      - "3000:3000"    # Web Dashboard
      - "3001:3001"    # API
    volumes:
      - ./ecommerce-app:/app
      - ./inventory:/app/src/modules/inventory
      - /app/node_modules
    environment:
      NODE_ENV: development
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672/ecommerce
      MONGODB_URL: mongodb://admin:admin123@mongodb:27017/ecommerce?authSource=admin
    depends_on:
      rabbitmq:
        condition: service_healthy
      mongodb:
        condition: service_healthy
    command: npm run dev
```

### **Volume Mapping Strategy** 📁

```
Host                              →    Container
./ecommerce-app                   →    /app
./inventory                       →    /app/src/modules/inventory
(anonymous volume)                →    /app/node_modules
```

**Benefícios**:
- ✅ Hot reload para desenvolvimento
- ✅ Preservação de node_modules otimizado
- ✅ Módulo inventory separado para flexibilidade
- ✅ Isolamento de dependências

---

## 🔍 Monitoramento e Observabilidade

### **Dashboard Real-time** 📊

```javascript
// WebSocket Events para o Dashboard
'message_flow': {
  eventType: String,
  data: Object,
  timestamp: Date,
  source: String,
  correlationId: String
}

'stats_update': {
  totalMessages: Number,
  activeOrders: Number,
  totalPayments: Number,
  inventoryAlerts: Number
}

'system_health': {
  services: {
    rabbitmq: Boolean,
    mongodb: Boolean,
    orders: Boolean,
    payments: Boolean,
    inventory: Boolean,
    notifications: Boolean
  }
}
```

### **Health Checks** 🏥

```javascript
// Endpoint: GET /api/health
{
  "status": "healthy",
  "services": {
    "rabbitmq": true,
    "mongodb": true,
    "orders": true,
    "dlqManager": true
  },
  "modules": {
    "orders": {
      "status": "healthy",
      "initialized": true,
      "database": { "connected": true, "orderCount": 42 },
      "eventBus": { "connected": true }
    },
    "payments": { /* status */ },
    "inventory": { /* status */ },
    "notifications": { /* status */ }
  }
}
```

### **Performance Metrics** 📈

```javascript
// Métricas coletadas automaticamente
{
  "events": {
    "published_per_minute": Number,
    "consumed_per_minute": Number,
    "failed_per_minute": Number,
    "average_processing_time": Number
  },
  "queues": {
    "total_messages": Number,
    "ready_messages": Number,
    "unacked_messages": Number,
    "consumers": Number
  },
  "database": {
    "connections": Number,
    "operations_per_second": Number,
    "average_response_time": Number
  }
}
```

---

## 🛠️ APIs e Endpoints

### **Core API Endpoints** 🔗

```bash
# Orders Module
POST   /api/orders                    # Criar pedido
GET    /api/orders                    # Listar pedidos
GET    /api/orders/:id                # Buscar pedido específico
PUT    /api/orders/:id/status         # Atualizar status do pedido
DELETE /api/orders/:id                # Cancelar pedido

# Payments Module  
POST   /api/payments/process          # Processar pagamento
PUT    /api/payments/:id/status       # Atualizar status do pagamento
GET    /api/payments                  # Listar pagamentos
GET    /api/payments/:id              # Buscar pagamento específico
POST   /api/payments/:id/refund       # Processar estorno

# Inventory Module
GET    /api/inventory/products        # Listar produtos
POST   /api/inventory/products        # Criar produto
PUT    /api/inventory/products/:id    # Atualizar produto
POST   /api/inventory/stock/add       # Adicionar estoque
POST   /api/inventory/stock/reserve   # Reservar estoque
GET    /api/inventory/stats           # Estatísticas de estoque
GET    /api/inventory/low-stock       # Alertas de estoque baixo

# Notifications Module
POST   /api/notifications/email       # Enviar email
POST   /api/notifications/sms         # Enviar SMS
POST   /api/notifications/push        # Enviar push notification
GET    /api/notifications             # Listar notificações

# System Endpoints
GET    /api/health                    # Health check completo
GET    /api/stats                     # Estatísticas do sistema
GET    /api/dlq                       # Dead Letter Queue status
```

### **Event Testing Endpoints** 🧪

```bash
# Dashboard Testing Functions (via Frontend)
testCreateOrder()           # Simula criação de pedido
testUpdateOrderStatus()     # Simula atualização de status
testProcessPayment()        # Simula processamento de pagamento  
testUpdatePaymentStatus()   # Simula atualização de pagamento
testAddStock()              # Simula adição de estoque
testReserveStock()          # Simula reserva de estoque
testSendEmail()             # Simula envio de email
testSendPush()              # Simula push notification
```

---

## 🔐 Padrões e Melhores Práticas

### **Event-Driven Architecture** 🔄

```javascript
// 1. Event Schema Validation
const eventSchema = {
  eventType: 'string',
  data: 'object',
  metadata: {
    source: 'string',
    correlationId: 'string', 
    timestamp: 'date',
    version: 'string'
  }
}

// 2. Idempotency
// Todos os eventos incluem correlationId para evitar reprocessamento

// 3. Event Versioning
// Eventos incluem version para backward compatibility

// 4. Error Handling
// Dead Letter Queues para mensagens falhadas
// Retry automático com backoff exponencial
```

### **Resilience Patterns** 🛡️

```javascript
// 1. Circuit Breaker
// Evita cascata de falhas entre serviços

// 2. Retry with Exponential Backoff
// Tentativas automáticas com intervalos crescentes

// 3. Dead Letter Queue
// Isolamento de mensagens problemáticas

// 4. Health Checks
// Monitoramento contínuo de saúde dos serviços

// 5. Graceful Degradation
// Sistema continua funcionando mesmo com falhas parciais
```

### **Performance Optimization** ⚡

```javascript
// 1. Connection Pooling
// Reutilização de conexões RabbitMQ e MongoDB

// 2. Message Batching
// Agrupamento de eventos para reduzir overhead

// 3. Async Processing
// Operações não-bloqueantes para melhor throughput

// 4. Caching Strategy
// Cache de configurações e dados frequentes

// 5. Resource Limits
// TTL, max retry count, queue size limits
```

---

## 🚀 Como Executar o Sistema

### **Pré-requisitos** ✅

```bash
# Ferramentas necessárias
- Docker & Docker Compose
- Node.js 18+ (para desenvolvimento local)
- Git
```

### **Inicialização** 🏁

```bash
# 1. Clonar o repositório
git clone <repository-url>
cd rabbit-mq

# 2. Subir a infraestrutura
docker-compose up -d

# 3. Verificar saúde dos serviços
curl http://localhost:3000/api/health

# 4. Acessar interfaces
# Dashboard:           http://localhost:3000
# API:                 http://localhost:3000/api
# RabbitMQ Management: http://localhost:15672
# MongoDB:             localhost:27017
```

### **Desenvolvimento** 👨‍💻

```bash
# Hot reload está habilitado via volumes
# Mudanças no código são refletidas automaticamente

# Logs em tempo real
docker-compose logs -f ecommerce-app

# Restart de serviço específico
docker-compose restart ecommerce-app

# Debug de eventos
# Use o Dashboard para visualizar fluxo em tempo real
```

---

## 📈 Métricas e KPIs

### **Métricas de Negócio** 💼

- **Order Processing Rate**: Pedidos processados por minuto
- **Payment Success Rate**: Taxa de sucesso de pagamentos
- **Inventory Turnover**: Rotatividade de estoque
- **Notification Delivery Rate**: Taxa de entrega de notificações
- **Customer Satisfaction**: Tempo de resposta médio

### **Métricas Técnicas** 🔧

- **Event Throughput**: Eventos processados por segundo
- **Message Latency**: Tempo médio de processamento de mensagens
- **Error Rate**: Taxa de erro por módulo
- **Queue Depth**: Profundidade das filas
- **Resource Utilization**: CPU, Memory, Disk usage

### **Métricas de Infraestrutura** 🏗️

- **Service Uptime**: Disponibilidade dos serviços
- **Database Performance**: Tempo de resposta do MongoDB
- **Network Latency**: Latência de rede entre serviços
- **Container Health**: Saúde dos containers Docker
- **Message Broker Performance**: Performance do RabbitMQ

---

## 🎯 Próximos Passos e Melhorias

### **Funcionalidades Futuras** 🔮

1. **Authentication & Authorization** 🔐
   - JWT tokens
   - Role-based access control
   - API rate limiting

2. **Advanced Monitoring** 📊
   - Prometheus + Grafana integration
   - Custom alerts and dashboards
   - Performance profiling

3. **Scalability Improvements** 📈
   - Horizontal scaling with replicas
   - Load balancing
   - Database sharding

4. **Enhanced Error Handling** 🛡️
   - Saga pattern implementation
   - Compensation transactions
   - Advanced retry strategies

5. **Testing & Quality** 🧪
   - Unit tests for all modules
   - Integration tests
   - Load testing
   - Security testing

### **Deployment Enhancements** 🚀

1. **Production Configuration** 🏭
   - Environment-specific configs
   - Secret management
   - SSL/TLS termination

2. **CI/CD Pipeline** 🔄
   - Automated testing
   - Build optimization
   - Deployment automation

3. **Monitoring & Alerting** 📱
   - Real-time alerts
   - Log aggregation
   - APM integration

---

## 📚 Recursos e Referências

### **Documentação Oficial** 📖

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Socket.IO Documentation](https://socket.io/docs/)

### **Padrões Arquiteturais** 🏛️

- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [CQRS Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

### **Best Practices** ✨

- [12-Factor App](https://12factor.net/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

---

## 🏆 Conclusão

Este sistema demonstra uma implementação robusta e escalável de arquitetura orientada por eventos usando RabbitMQ. As principais conquistas incluem:

✅ **Desacoplamento**: Módulos independentes comunicam-se via eventos  
✅ **Escalabilidade**: Cada componente pode ser escalado independentemente  
✅ **Resiliência**: Sistema tolera falhas em módulos específicos  
✅ **Observabilidade**: Monitoramento completo via dashboard em tempo real  
✅ **Manutenibilidade**: Código modular e bem estruturado  
✅ **Performance**: Processamento assíncrono de alta performance  

O sistema está pronto para produção com as devidas adaptações de segurança, monitoramento e configuração de ambiente.

---

*Documento criado em: 21 de Agosto de 2025*  
*Versão: 1.0*  
*Sistema: E-commerce RabbitMQ Architecture*
