# 📋 Plano de Implementação - E-commerce Modular com RabbitMQ

## 🎯 Objetivo
Implementar um sistema e-commerce modular onde diferentes módulos se comunicam via RabbitMQ, com interface gráfica para acompanhar o fluxo de mensagens em tempo real.

## 🏗️ Arquitetura Simplificada

### **Sistema Único Modular** (vs Microsserviços)
- ✅ **Menor complexidade**: 1 aplicação, 1 Dockerfile, 1 banco
- ✅ **Mais didático**: Código na mesma base, fácil debug
- ✅ **Menos recursos**: Menor uso de CPU/RAM
- ✅ **Desenvolvimento rápido**: Sem overhead de rede entre serviços

### **Módulos Independentes**
- 📦 **Orders**: Gerencia pedidos
- 💳 **Payments**: Processa pagamentos
- 📧 **Notifications**: Envia notificações
- 📦 **Inventory**: Controla estoque
- 🌐 **Dashboard**: Interface gráfica em tempo real

---

## 📅 ETAPA 1: Preparação do Ambiente Base
**Tempo estimado**: 30 minutos | **Prioridade**: 🔴 Alta

### **1.1 - Estrutura de Pastas** (5 min)
```bash
# Criar estrutura básica
mkdir ecommerce-app
mkdir rabbitmq
mkdir docs
```

### **1.2 - Docker Compose Base** (10 min)
- RabbitMQ Server + Management UI
- MongoDB para persistência
- Network para comunicação

### **1.3 - Configuração RabbitMQ** (10 min)
- Exchanges pré-configurados
- Filas básicas
- Usuários e permissões

### **1.4 - Aplicação Node.js Base** (5 min)
- package.json com dependências
- Estrutura de pastas dos módulos
- Servidor Express básico

### **📋 Critério de Conclusão Etapa 1:**
- [ ] `docker-compose up` sobe RabbitMQ + MongoDB
- [ ] Management UI acessível em `http://localhost:15672`
- [ ] Aplicação Node.js inicia sem erros
- [ ] Conexão com RabbitMQ estabelecida

---

## 📅 ETAPA 2: EventBus e Infraestrutura de Eventos
**Tempo estimado**: 45 minutos | **Prioridade**: 🔴 Alta

### **2.1 - Cliente RabbitMQ (EventBus)** (20 min)
```javascript
// shared/events/EventBus.js
class EventBus {
  async publish(exchange, routingKey, message) {}
  async subscribe(queue, handler) {}
  async createExchange(name, type) {}
  async createQueue(name, options) {}
}
```

### **2.2 - Definições de Eventos** (10 min)
```javascript
// shared/events/events.js
const EVENTS = {
  ORDER_CREATED: 'order.created',
  PAYMENT_PROCESSED: 'payment.processed',
  INVENTORY_RESERVED: 'inventory.reserved',
  NOTIFICATION_SENT: 'notification.sent'
}
```

### **2.3 - Logger de Mensagens** (10 min)
```javascript
// shared/events/messageLogger.js
// Para rastrear todas as mensagens do sistema
```

### **2.4 - Configuração de Exchanges e Queues** (5 min)
- `ecommerce.events` (Topic Exchange)
- `ecommerce.notifications` (Fanout Exchange)
- Filas com bindings apropriados

### **📋 Critério de Conclusão Etapa 2:**
- [ ] EventBus conecta com RabbitMQ
- [ ] Exchanges e queues criados automaticamente
- [ ] Publish/Subscribe funcionando
- [ ] Logs de mensagens sendo capturados

---

## 📅 ETAPA 3: Módulo de Pedidos (Orders)
**Tempo estimado**: 45 minutos | **Prioridade**: 🔴 Alta

### **3.1 - Model e Controller** (15 min)
```javascript
// modules/orders/model.js
const Order = {
  id, customerId, items, status, total, createdAt
}

// modules/orders/controller.js
class OrderController {
  async createOrder(req, res) {}
  async getOrder(req, res) {}
  async updateOrderStatus(req, res) {}
}
```

### **3.2 - Rotas REST** (10 min)
```javascript
// modules/orders/routes.js
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status
GET    /api/orders
```

### **3.3 - Event Publisher** (10 min)
```javascript
// modules/orders/events/publisher.js
class OrderEventPublisher {
  async publishOrderCreated(order) {}
  async publishOrderUpdated(order) {}
}
```

### **3.4 - Event Subscriber** (10 min)
```javascript
// modules/orders/events/subscriber.js
class OrderEventSubscriber {
  async handlePaymentProcessed(message) {}
  async handleInventoryReserved(message) {}
}
```

### **📋 Critério de Conclusão Etapa 3:**
- [ ] API REST do módulo Orders funcionando
- [ ] Criar pedido publica evento `order.created`
- [ ] Pedidos persistidos no MongoDB
- [ ] Subscriber recebe eventos de outros módulos

---

## 📅 ETAPA 4: Módulo de Pagamentos (Payments)
**Tempo estimado**: 40 minutos | **Prioridade**: 🟡 Média

### **4.1 - Service de Pagamento** (15 min)
```javascript
// modules/payments/service.js
class PaymentService {
  async processPayment(orderData) {
    // Simula processamento (aprovado/rejeitado)
  }
}
```

### **4.2 - Controller e Rotas** (10 min)
```javascript
POST   /api/payments
GET    /api/payments/:id
GET    /api/payments/order/:orderId
```

### **4.3 - Event Handlers** (15 min)
- Subscriber: Escuta `order.created`
- Publisher: Publica `payment.processed` (success/failed)

### **📋 Critério de Conclusão Etapa 4:**
- [ ] Recebe evento `order.created`
- [ ] Processa pagamento automaticamente
- [ ] Publica `payment.processed` com resultado
- [ ] APIs REST funcionando

---

## 📅 ETAPA 5: Módulo de Notificações
**Tempo estimado**: 35 minutos | **Prioridade**: 🟡 Média

### **5.1 - Services de Notificação** (15 min)
```javascript
// modules/notifications/services/emailService.js
class EmailService {
  async sendOrderConfirmation(order) {}
  async sendPaymentConfirmation(payment) {}
}

// modules/notifications/services/smsService.js  
class SMSService {
  async sendOrderAlert(order) {}
}
```

### **5.2 - Templates HTML** (10 min)
- Template de confirmação de pedido
- Template de confirmação de pagamento

### **5.3 - Event Subscribers** (10 min)
- Escuta `order.created` → envia confirmação
- Escuta `payment.processed` → envia resultado

### **📋 Critério de Conclusão Etapa 5:**
- [ ] Recebe eventos de pedidos e pagamentos
- [ ] Envia notificações (simuladas) por email/SMS
- [ ] Templates HTML renderizados corretamente

---

## 📅 ETAPA 6: Módulo de Estoque (Inventory)
**Tempo estimado**: 40 minutos | **Prioridade**: 🟡 Média

### **6.1 - Model de Produto** (10 min)
```javascript
// modules/inventory/model.js
const Product = {
  id, name, price, stock, reserved, available
}
```

### **6.2 - Controller e Rotas** (15 min)
```javascript
GET    /api/products
GET    /api/products/:id
POST   /api/products/:id/reserve
POST   /api/products/:id/release
```

### **6.3 - Event Handlers** (15 min)
- Subscriber: Escuta `order.created` → reserva estoque
- Publisher: Publica `inventory.reserved` ou `inventory.failed`

### **📋 Critério de Conclusão Etapa 6:**
- [ ] Produtos com controle de estoque
- [ ] Reserva automática quando pedido criado
- [ ] Publica eventos de confirmação/falha

---

## 📅 ETAPA 7: Interface Gráfica (Dashboard) ✅ **CONCLUÍDA**
**Tempo estimado**: 60 minutos | **Prioridade**: 🟢 Baixa (mas importante para didática)

### **7.1 - Dashboard Principal** (20 min)
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>E-commerce RabbitMQ Dashboard</title>
  <link href="/css/bootstrap.min.css" rel="stylesheet">
  <link href="/css/custom.css" rel="stylesheet">
</head>
<body>
  <div class="container-fluid">
    <!-- Navigation -->
    <nav class="navbar navbar-dark bg-primary">
      <span class="navbar-brand">🐰 RabbitMQ E-commerce Dashboard</span>
    </nav>
    
    <!-- Main Content -->
    <div class="row mt-3">
      <!-- Message Flow -->
      <div class="col-md-8">
        <div id="message-flow"></div>
      </div>
      
      <!-- Queue Status -->
      <div class="col-md-4">
        <div id="queue-status"></div>
      </div>
    </div>
    
    <!-- Event Timeline -->
    <div class="row mt-3">
      <div class="col-12">
        <div id="event-timeline"></div>
      </div>
    </div>
  </div>
</body>
</html>
```

### **7.2 - WebSocket para Tempo Real** (15 min)
```javascript
// WebSocket para receber eventos em tempo real
// js/websocket.js
class DashboardWebSocket {
  connect() {}
  onMessage(callback) {}
  onQueueUpdate(callback) {}
}
```

### **7.3 - Componentes Visuais** (25 min)

#### **Message Flow Diagram**
```html
<!-- components/message-flow.html -->
<div class="card">
  <div class="card-header">📊 Fluxo de Mensagens</div>
  <div class="card-body">
    <div class="message-flow-diagram">
      <!-- Diagrama visual do fluxo -->
      <div class="module" id="orders">Orders</div>
      <div class="arrow">→</div>
      <div class="exchange" id="exchange">Exchange</div>
      <div class="arrow">→</div>
      <div class="module" id="payments">Payments</div>
    </div>
  </div>
</div>
```

#### **Queue Status Monitor**
```html
<!-- components/queue-status.html -->
<div class="card">
  <div class="card-header">📋 Status das Filas</div>
  <div class="card-body">
    <div class="queue-list">
      <div class="queue-item">
        <span class="queue-name">orders.queue</span>
        <span class="badge bg-primary queue-count">0</span>
      </div>
      <!-- Mais filas... -->
    </div>
  </div>
</div>
```

#### **Event Timeline**
```html
<!-- components/event-timeline.html -->
<div class="card">
  <div class="card-header">⏰ Timeline de Eventos</div>
  <div class="card-body">
    <div class="timeline" id="event-timeline">
      <!-- Eventos em tempo real -->
    </div>
  </div>
</div>
```

### **📋 Critério de Conclusão Etapa 7:**
- [ ] Dashboard acessível em `http://localhost:3000`
- [ ] Fluxo de mensagens visível em tempo real
- [ ] Status das filas atualizado automaticamente
- [ ] Timeline de eventos funcionando
- [ ] Interface responsiva com Bootstrap 5

---

## 📅 ETAPA 8: Integração e Testes Completos
**Tempo estimado**: 45 minutos | **Prioridade**: 🔴 Alta

### **8.1 - Fluxo Completo** (20 min)
1. **Criar Pedido** → API REST
2. **Order Created** → Event published
3. **Inventory Reserved** → Automatic
4. **Payment Processed** → Automatic
5. **Notifications Sent** → Automatic
6. **Dashboard Updated** → Real-time

### **8.2 - Testes de Cenários** (15 min)
- ✅ Pedido com sucesso (happy path)
- ❌ Pedido sem estoque
- ❌ Pagamento rejeitado
- 🔄 Reprocessamento de falhas

### **8.3 - Scripts de Teste** (10 min)
```bash
# scripts/test-flow.sh
# Automatizar testes de fluxo completo
```

### **📋 Critério de Conclusão Etapa 8:**
- [x] Fluxo completo funcionando end-to-end ✅
- [x] Todos os cenários testados ✅
- [x] Dashboard mostra fluxo em tempo real ✅
- [x] Error handling funcionando ✅

**🎉 STATUS: CONCLUÍDA EM 19/08/2025** ✅

---

## 📅 ETAPA 9: Dead Letter Queues e Error Handling
**Tempo estimado**: 30 minutos | **Prioridade**: 🟡 Média

### **9.1 - Dead Letter Queue Setup** (15 min)
- Configurar DLQ para mensagens que falham
- Retry logic com backoff exponencial

### **9.2 - Error Dashboard** (15 min)
- Visualizar mensagens que falharam
- Interface para reprocessar manualmente

### **📋 Critério de Conclusão Etapa 9:**
- [ ] DLQ configurada e funcionando
- [ ] Mensagens com erro são capturadas
- [ ] Interface para visualizar/reprocessar erros

---

## 📅 ETAPA 10: Documentação e Finalização
**Tempo estimado**: 30 minutos | **Prioridade**: 🟢 Baixa

### **10.1 - README Completo** (15 min)
- Como executar o projeto
- Explicação dos conceitos
- Screenshots do dashboard

### **10.2 - Documentação de APIs** (10 min)
- Swagger/OpenAPI ou documentação markdown

### **10.3 - Video/GIF de Demonstração** (5 min)
- Capturar fluxo funcionando para portfolio

---

## 📊 **RESUMO GERAL**

| Etapa | Tempo | Prioridade | Status |
|-------|-------|------------|--------|
| 1. Ambiente Base | 30 min | 🔴 Alta | ✅ **CONCLUÍDA** |
| 2. EventBus | 45 min | 🔴 Alta | ✅ **CONCLUÍDA** |
| 3. Orders Module | 45 min | 🔴 Alta | ✅ **CONCLUÍDA** |
| 4. Payments Module | 40 min | 🟡 Média | ✅ **CONCLUÍDA** |
| 5. Notifications Module | 35 min | 🟡 Média | ✅ **CONCLUÍDA** |
| 6. Inventory Module | 40 min | 🟡 Média | ✅ **CONCLUÍDA** |
| 7. Dashboard Interface | 60 min | 🟢 Baixa | ⏳ |
| 8. Integração e Testes | 45 min | 🔴 Alta | ⏳ |
| 9. Error Handling | 30 min | 🟡 Média | ⏳ |
| 10. Documentação | 30 min | 🟢 Baixa | ⏳ |

**⏱️ TEMPO TOTAL ESTIMADO: 6 horas**

---

## 🎯 **ESTRATÉGIA DE IMPLEMENTAÇÃO**

### **Fase 1: MVP Core (2.5 horas)**
- Etapas 1, 2, 3, 8 (básico)
- **Resultado**: Sistema básico funcionando

### **Fase 2: Funcionalidades Completas (2 horas)** 
- Etapas 4, 5, 6
- **Resultado**: Todos os módulos funcionando

### **Fase 3: Interface e Polish (1.5 horas)**
- Etapas 7, 9, 10
- **Resultado**: Sistema completo com dashboard

---

## 🤔 **Quer começar a implementação?**

Sugiro começarmos com a **Fase 1 (MVP Core)** que em 2.5 horas você terá:
- ✅ RabbitMQ funcionando
- ✅ Sistema modular básico  
- ✅ Módulo de pedidos completo
- ✅ Fluxo de eventos funcionando
- ✅ Testes básicos

**Posso começar implementando a Etapa 1 agora?** 🚀
