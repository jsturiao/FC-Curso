# Sistema de E-commerce Didático com Kafka
## Plano de Implementação Detalhado

---

## 📋 Visão Geral e Objetivos

### Propósito
Criar um sistema de e-commerce simplificado que demonstre visualmente os principais conceitos e funcionalidades do Apache Kafka em um ambiente didático e prático.

### Objetivos de Aprendizado
- **Arquitetura Kafka**: Brokers, tópicos, partições, replicação
- **Padrões de Mensageria**: Producer/Consumer, Event Sourcing, Saga Pattern
- **Operações**: Schema Registry, Dead Letter Queue, Observabilidade
- **Visualização**: Interface web mostrando fluxo de eventos em tempo real

### Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   checkout-api  │───▶│  Apache Kafka   │◀───│ payment-service │
│   (Producer)    │    │   + Kafka UI    │    │ (Consumer/Prod) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ dashboard-web   │    │inventory-service│    │notification-svc │
│ (Visualização)  │    │ (Consumer/Prod) │    │   (Consumer)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Persistência)│
                    └─────────────────┘
```

### Stack Tecnológica
- **Broker**: Apache Kafka com KRaft
- **Interface**: Kafka UI (Provectus)
- **Microserviços**: Node.js + NestJS
- **Frontend**: React + Vite + WebSocket
- **Banco**: PostgreSQL
- **Observabilidade**: Prometheus + Grafana
- **Orquestração**: Docker Compose

---

## 🗺️ Mapa de Conceitos Kafka vs Projeto

| Conceito Kafka | Onde Aparece no Projeto | Fase |
|----------------|-------------------------|------|
| **Producers** | checkout-api criando pedidos | Fase 1 |
| **Consumers** | Todos os serviços processando eventos | Fase 1 |
| **Tópicos** | orders.new, payments.*, inventory.* | Fase 1-2 |
| **Partições** | Particionamento por orderId | Fase 1 |
| **Consumer Groups** | Cada serviço em seu grupo | Fase 1 |
| **Schema Registry** | Evolução de schemas de eventos | Fase 2 |
| **Dead Letter Queue** | Tratamento de falhas | Fase 3 |
| **Idempotência** | Evitar duplicação de pedidos | Fase 3 |
| **Transações** | Exactly-once delivery | Fase 3 |
| **Stream Processing** | Agregações e métricas | Fase 4 |

---

## 🚀 Fase 0 - Fundamentos e Infraestrutura

### Etapa 0.1 - Setup do Docker Compose Base

**Objetivo**: Criar ambiente Kafka completo e funcional

#### Microfases:
1. **Configuração do Kafka**
   - Broker único com KRaft (sem Zookeeper)
   - Configurações de retenção e partições
   - Rede Docker isolada

2. **Interface de Administração**
   - Kafka UI para visualização
   - Configuração de acesso web

3. **Variáveis de Ambiente**
   - Centralização de configurações
   - Facilitar mudanças entre ambientes

**Artefatos Gerados**:
- `docker-compose.yml`
- `.env`
- `scripts/setup-topics.sh`

**Comandos Essenciais**:
```bash
# Subir ambiente
docker compose up -d

# Verificar logs do Kafka
docker compose logs kafka -f

# Criar tópicos iniciais
docker compose exec kafka kafka-topics --create --topic orders.new --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

**Critérios de Aceite**:
- [ ] Kafka rodando e acessível na porta 9092
- [ ] Kafka UI acessível em http://localhost:8080
- [ ] Conseguir criar/deletar tópicos via UI
- [ ] Logs sem erros críticos

---

### Etapa 0.2 - Observabilidade Básica

**Objetivo**: Configurar monitoramento básico do cluster

#### Microfases:
1. **Prometheus + Grafana**
   - Coleta de métricas do Kafka
   - Dashboards pré-configurados

2. **JMX Exporter**
   - Exposição de métricas JMX do Kafka
   - Configuração de métricas relevantes

**Artefatos Gerados**:
- `monitoring/prometheus.yml`
- `monitoring/grafana-dashboards/`
- Extensão do `docker-compose.yml`

**Critérios de Aceite**:
- [ ] Grafana acessível em http://localhost:3000
- [ ] Dashboard "Kafka Overview" funcionando
- [ ] Métricas básicas sendo coletadas

---

### Etapa 0.3 - Schema Registry

**Objetivo**: Gerenciamento centralizado de schemas

#### Microfases:
1. **Confluent Schema Registry**
   - Container dedicado
   - Integração com Kafka

2. **Primeiro Schema**
   - Schema Avro para eventos de pedido
   - Teste de compatibilidade

**Artefatos Gerados**:
- `schemas/order-created.avsc`
- Scripts de registro de schemas

**Comandos Essenciais**:
```bash
# Registrar schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data @schemas/order-created.avsc \
  http://localhost:8081/subjects/orders.new-value/versions
```

**Critérios de Aceite**:
- [ ] Schema Registry rodando na porta 8081
- [ ] Schema de pedido registrado com sucesso
- [ ] Compatibilidade BACKWARD configurada

---

## 🛍️ Fase 1 - Producer/Consumer "Hello, Orders"

### Etapa 1.1 - Checkout API (Producer Principal)

**Objetivo**: Criar primeiro microserviço que produz eventos

#### Microfases:
1. **Setup NestJS**
   - Projeto base com estrutura modular
   - Configuração do cliente Kafka (KafkaJS)
   - Health check endpoints

2. **Endpoint de Checkout**
   - `POST /orders` para criar pedidos
   - Validação de payload (class-validator)
   - Geração de orderId único

3. **Produção de Eventos**
   - Publicar em `orders.new`
   - Chave de particionamento por orderId
   - Configuração de idempotência

4. **Tratamento de Erros**
   - Retry automático
   - Logging estruturado
   - Métricas básicas

**Estrutura do Projeto**:
```
checkout-api/
├── src/
│   ├── orders/
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   └── dto/create-order.dto.ts
│   ├── kafka/
│   │   ├── kafka.module.ts
│   │   └── kafka.service.ts
│   └── main.ts
├── package.json
└── docker-compose.override.yml
```

**Payload de Exemplo**:
```json
{
  "orderId": "ord_1234567890",
  "customerId": "cust_abc123",
  "items": [
    {
      "productId": "prod_xyz789",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "totalAmount": 59.98,
  "timestamp": "2025-08-21T10:30:00Z"
}
```

**Configuração Kafka**:
```typescript
// kafka.service.ts
export class KafkaService {
  private kafka = new Kafka({
    clientId: 'checkout-api',
    brokers: ['localhost:9092'],
  });

  private producer = this.kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
    retries: 5,
  });
}
```

**Comandos de Teste**:
```bash
# Criar pedido via API
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "items": [{"productId": "prod_1", "quantity": 2, "price": 25.00}]
  }'

# Verificar mensagem no tópico
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders.new \
  --from-beginning
```

**Critérios de Aceite**:
- [ ] API rodando na porta 3001
- [ ] Endpoint POST /orders funcional
- [ ] Eventos chegando ao tópico `orders.new`
- [ ] Mensagens visíveis no Kafka UI
- [ ] Health check retornando status OK

---

### Etapa 1.2 - Dashboard Web (Primeira Versão)

**Objetivo**: Interface visual para acompanhar eventos em tempo real

#### Microfases:
1. **Setup React + Vite**
   - Projeto frontend moderno
   - Configuração de WebSocket
   - Componentes base

2. **Telemetry Gateway**
   - Serviço Node.js intermediário
   - Consumer Kafka → WebSocket bridge
   - Agregação de eventos

3. **Interface de Eventos**
   - Lista em tempo real de eventos
   - Cards visuais por tipo de evento
   - Timeline básica

**Estrutura do Frontend**:
```
dashboard-web/
├── src/
│   ├── components/
│   │   ├── EventList.tsx
│   │   ├── EventCard.tsx
│   │   └── OrderTimeline.tsx
│   ├── hooks/
│   │   └── useWebSocket.ts
│   ├── types/
│   │   └── events.ts
│   └── App.tsx
└── package.json
```

**Telemetry Gateway**:
```typescript
// telemetry-gateway/src/main.ts
export class TelemetryGateway {
  private consumer = this.kafka.consumer({
    groupId: 'telemetry-gateway',
  });

  async consumeEvents() {
    await this.consumer.subscribe({ 
      topics: ['orders.new', 'payments.*', 'inventory.*'] 
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = JSON.parse(message.value.toString());
        this.websocketServer.emit('event', { topic, event });
      },
    });
  }
}
```

**Critérios de Aceite**:
- [ ] Dashboard acessível em http://localhost:3000
- [ ] WebSocket conectado e funcional
- [ ] Eventos aparecendo em tempo real
- [ ] Interface responsiva e intuitiva

---

### Etapa 1.3 - Payment Service (Consumer + Producer)

**Objetivo**: Primeiro serviço que consome e produz eventos

#### Microfases:
1. **Setup do Serviço**
   - NestJS com configuração Kafka
   - Consumer para `orders.new`
   - Producer para `payments.*`

2. **Lógica de Pagamento**
   - Simulação de processamento
   - Probabilidade configurável de falha
   - Estados: pending, approved, failed

3. **Produção de Eventos**
   - `payments.requested` (imediato)
   - `payments.approved` ou `payments.failed` (após delay)

**Fluxo de Eventos**:
```
orders.new → Payment Service → payments.requested → [processamento] → payments.approved/failed
```

**Consumer Configuration**:
```typescript
// payment.service.ts
@Injectable()
export class PaymentService {
  async processOrder(order: Order) {
    // 1. Publicar payment.requested
    await this.publishEvent('payments.requested', {
      orderId: order.orderId,
      amount: order.totalAmount,
      status: 'pending',
      timestamp: new Date(),
    });

    // 2. Simular processamento (1-3 segundos)
    await this.delay(Math.random() * 2000 + 1000);

    // 3. Resultado baseado em probabilidade
    const success = Math.random() > 0.2; // 80% sucesso

    const event = success ? 'payments.approved' : 'payments.failed';
    await this.publishEvent(event, {
      orderId: order.orderId,
      amount: order.totalAmount,
      status: success ? 'approved' : 'failed',
      timestamp: new Date(),
    });
  }
}
```

**Critérios de Aceite**:
- [ ] Serviço rodando na porta 3002
- [ ] Consumindo `orders.new` sem lag
- [ ] Publicando eventos de pagamento
- [ ] Taxa de sucesso configurável funcionando
- [ ] Logs estruturados com orderId

---

## 📦 Fase 2 - Estoque, Orquestração e Regras de Negócio

### Etapa 2.1 - Inventory Service

**Objetivo**: Gerenciar estoque com persistência em PostgreSQL

#### Microfases:
1. **Setup com PostgreSQL**
   - Configuração TypeORM
   - Entidades de produto e estoque
   - Migrations iniciais

2. **Consumer de Pagamentos**
   - Escutar `payments.approved`
   - Verificar disponibilidade
   - Reservar/baixar estoque

3. **Estados do Estoque**
   - `inventory.reserved` (sucesso)
   - `inventory.failed` (sem estoque)
   - Rollback em caso de falha

**Schema do Banco**:
```sql
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) REFERENCES products(id),
  order_id VARCHAR(50) NOT NULL,
  movement_type VARCHAR(20) NOT NULL, -- 'reserve', 'confirm', 'release'
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Lógica de Reserva**:
```typescript
@Injectable()
export class InventoryService {
  async reserveStock(orderId: string, items: OrderItem[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product || product.availableStock < item.quantity) {
          await this.publishEvent('inventory.failed', {
            orderId,
            reason: 'insufficient_stock',
            productId: item.productId,
          });
          throw new Error('Insufficient stock');
        }

        // Reservar estoque
        await queryRunner.manager.update(Product, 
          { id: item.productId },
          { reservedQuantity: () => 'reserved_quantity + ' + item.quantity }
        );
      }

      await queryRunner.commitTransaction();
      
      await this.publishEvent('inventory.reserved', {
        orderId,
        items,
        timestamp: new Date(),
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Critérios de Aceite**:
- [ ] PostgreSQL rodando e conectado
- [ ] Estoque sendo reservado corretamente
- [ ] Eventos de sucesso/falha publicados
- [ ] Transações atômicas funcionando
- [ ] Seeds de produtos carregados

---

### Etapa 2.2 - Orchestrator Saga

**Objetivo**: Coordenar o fluxo completo do pedido

#### Microfases:
1. **State Machine**
   - Estados do pedido: created, payment_pending, payment_approved, inventory_reserved, completed, failed
   - Transições baseadas em eventos
   - Timeouts para cada etapa

2. **Coordenação de Eventos**
   - Escutar múltiplos tópicos
   - Correlacionar por orderId
   - Manter estado persistente

3. **Compensação (Saga Pattern)**
   - Rollback em caso de falha
   - Liberar estoque reservado
   - Estornar pagamento (simulado)

4. **Dead Letter Queue**
   - `orders.dlq` para casos irrecuperáveis
   - Estratégia de reprocessamento

**State Machine**:
```typescript
export enum OrderStatus {
  CREATED = 'created',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_APPROVED = 'payment_approved',
  INVENTORY_RESERVED = 'inventory_reserved',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity()
export class OrderSaga {
  @PrimaryColumn()
  orderId: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'json' })
  orderData: any;

  @Column({ type: 'timestamp', nullable: true })
  timeout: Date;

  @Column({ type: 'json', nullable: true })
  compensationData: any;
}
```

**Lógica de Orquestração**:
```typescript
@Injectable()
export class OrderOrchestratorService {
  async handlePaymentApproved(event: PaymentApprovedEvent) {
    const saga = await this.findSaga(event.orderId);
    
    if (saga.status === OrderStatus.PAYMENT_PENDING) {
      saga.status = OrderStatus.PAYMENT_APPROVED;
      await this.saveSaga(saga);
      
      // Próximo passo: reservar estoque
      await this.publishEvent('inventory.reserve_request', {
        orderId: event.orderId,
        items: saga.orderData.items,
      });
    }
  }

  async handleInventoryReserved(event: InventoryReservedEvent) {
    const saga = await this.findSaga(event.orderId);
    
    if (saga.status === OrderStatus.PAYMENT_APPROVED) {
      saga.status = OrderStatus.COMPLETED;
      await this.saveSaga(saga);
      
      await this.publishEvent('orders.confirmed', {
        orderId: event.orderId,
        status: 'completed',
        timestamp: new Date(),
      });
    }
  }

  // Compensação em caso de falha
  async handleInventoryFailed(event: InventoryFailedEvent) {
    const saga = await this.findSaga(event.orderId);
    
    // Estornar pagamento
    await this.publishEvent('payments.refund', {
      orderId: event.orderId,
      reason: 'inventory_unavailable',
    });

    saga.status = OrderStatus.FAILED;
    await this.saveSaga(saga);
  }
}
```

**Critérios de Aceite**:
- [ ] Fluxo completo funcionando (pedido → pagamento → estoque → confirmação)
- [ ] Compensação em caso de falha do estoque
- [ ] Timeouts sendo respeitados
- [ ] Estado persistido corretamente
- [ ] DLQ configurada e funcional

---

### Etapa 2.3 - Notification Service

**Objetivo**: Notificar clientes sobre status dos pedidos

#### Microfases:
1. **Consumer Multi-tópicos**
   - `orders.confirmed`
   - `orders.failed`
   - `inventory.failed`

2. **Simulação de Notificações**
   - Email (log simulado)
   - SMS (log simulado)
   - Push notification (log simulado)

3. **Evento de Telemetria**
   - Publicar `notifications.sent`
   - Dados para dashboard

**Service Implementation**:
```typescript
@Injectable()
export class NotificationService {
  async sendOrderConfirmation(orderId: string, customerData: any) {
    // Simular envio de email
    this.logger.log(`📧 Email sent to ${customerData.email}: Order ${orderId} confirmed`);
    
    // Simular SMS
    this.logger.log(`📱 SMS sent to ${customerData.phone}: Your order ${orderId} is confirmed!`);
    
    await this.publishEvent('notifications.sent', {
      orderId,
      customerId: customerData.customerId,
      type: 'order_confirmation',
      channels: ['email', 'sms'],
      timestamp: new Date(),
    });
  }

  async sendOrderFailed(orderId: string, reason: string, customerData: any) {
    this.logger.log(`📧 Email sent to ${customerData.email}: Order ${orderId} failed - ${reason}`);
    
    await this.publishEvent('notifications.sent', {
      orderId,
      customerId: customerData.customerId,
      type: 'order_failed',
      channels: ['email'],
      reason,
      timestamp: new Date(),
    });
  }
}
```

**Critérios de Aceite**:
- [ ] Notificações sendo enviadas para pedidos confirmados
- [ ] Notificações de falha funcionando
- [ ] Logs estruturados e legíveis
- [ ] Eventos de telemetria publicados

---

### Etapa 2.4 - Dashboard Web (Versão 2)

**Objetivo**: Interface visual avançada com timeline e métricas

#### Microfases:
1. **Timeline Visual**
   - Componente de linha do tempo por pedido
   - Estados visuais (pending, success, error)
   - Tempo decorrido entre etapas

2. **Filtros e Busca**
   - Filtrar por status
   - Buscar por orderId
   - Filtrar por período

3. **Métricas em Tempo Real**
   - Taxa de sucesso
   - Tempo médio de processamento
   - Pedidos por minuto

4. **Gráficos Interativos**
   - Recharts para visualizações
   - Gráfico de barras (status)
   - Gráfico de linha (volume)

**Componentes React**:
```tsx
// OrderTimeline.tsx
export const OrderTimeline: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { events } = useOrderEvents(orderId);
  
  return (
    <div className="timeline">
      {events.map((event, index) => (
        <TimelineItem 
          key={index}
          event={event}
          status={getEventStatus(event)}
          timestamp={event.timestamp}
        />
      ))}
    </div>
  );
};

// MetricsDashboard.tsx
export const MetricsDashboard: React.FC = () => {
  const { metrics } = useRealTimeMetrics();
  
  return (
    <div className="metrics-grid">
      <MetricCard 
        title="Taxa de Sucesso"
        value={`${metrics.successRate}%`}
        trend={metrics.successTrend}
      />
      <MetricCard 
        title="Tempo Médio"
        value={`${metrics.avgTime}s`}
        trend={metrics.timeTrend}
      />
      <BarChart data={metrics.statusDistribution} />
      <LineChart data={metrics.volumeOverTime} />
    </div>
  );
};
```

**WebSocket Events**:
```typescript
// useWebSocket.ts
export const useWebSocket = () => {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3010/events');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'order.created':
          addEvent(data.payload);
          break;
        case 'order.updated':
          updateEvent(data.payload);
          break;
        case 'metrics.updated':
          updateMetrics(data.payload);
          break;
      }
    };
  }, []);
};
```

**Critérios de Aceite**:
- [ ] Timeline visual funcionando
- [ ] Filtros operacionais
- [ ] Métricas atualizando em tempo real
- [ ] Gráficos interativos
- [ ] Interface responsiva

---

## 🛡️ Fase 3 - Robustez Operacional

### Etapa 3.1 - Exactly-Once e Idempotência

**Objetivo**: Garantir entrega exatamente uma vez e operações idempotentes

#### Microfases:
1. **Transações Kafka**
   - Configurar EOS (Exactly-Once Semantics)
   - Transactional producers
   - Read-committed consumers

2. **Idempotent Consumers**
   - Deduplicação por chave única
   - Tabela de controle de processamento
   - Patterns de idempotência

3. **Database Transactions**
   - Outbox pattern para publicação de eventos
   - Transações distribuídas quando necessário

**Producer Configuration**:
```typescript
// Transactional Producer
const producer = kafka.producer({
  idempotent: true,
  transactionTimeout: 30000,
});

await producer.initTransactions();

// Uso transacional
await producer.transaction(async (transaction) => {
  await transaction.send({
    topic: 'orders.confirmed',
    messages: [{
      key: orderId,
      value: JSON.stringify(orderData),
    }],
  });

  // Operação no banco na mesma transação lógica
  await this.updateOrderStatus(orderId, 'confirmed');
});
```

**Idempotent Consumer Pattern**:
```typescript
@Entity()
export class ProcessedMessage {
  @PrimaryColumn()
  messageId: string;

  @Column()
  topic: string;

  @Column()
  partition: number;

  @Column()
  offset: string;

  @Column()
  processedAt: Date;
}

@Injectable()
export class IdempotentConsumerService {
  async processMessage(message: KafkaMessage) {
    const messageId = this.generateMessageId(message);
    
    // Verificar se já foi processado
    const processed = await this.processedMessageRepo.findOne({
      where: { messageId }
    });

    if (processed) {
      this.logger.log(`Message ${messageId} already processed, skipping`);
      return;
    }

    // Processar e marcar como processado na mesma transação
    await this.dataSource.transaction(async (manager) => {
      await this.businessLogic(message, manager);
      
      await manager.save(ProcessedMessage, {
        messageId,
        topic: message.topic,
        partition: message.partition,
        offset: message.offset,
        processedAt: new Date(),
      });
    });
  }
}
```

**Critérios de Aceite**:
- [ ] Sem duplicação de pedidos mesmo com retry
- [ ] Transações funcionando corretamente
- [ ] Tabela de controle populada
- [ ] Performance aceitável com overhead

---

### Etapa 3.2 - Estratégias de Retry e Backoff

**Objetivo**: Tratamento robusto de falhas temporárias

#### Microfases:
1. **Retry Topics**
   - Tópicos com delay: `orders.retry.5s`, `orders.retry.30s`, `orders.retry.5m`
   - Headers com tentativas e timestamp
   - Routing automático

2. **Exponential Backoff**
   - Delays progressivos
   - Jitter para evitar thundering herd
   - Limite máximo de tentativas

3. **Poison Pill Handling**
   - Detecção de mensagens problemáticas
   - Isolamento em DLQ
   - Alertas para investigação

**Retry Infrastructure**:
```typescript
@Injectable()
export class RetryService {
  private retryTopics = [
    { name: 'orders.retry.5s', delay: 5000 },
    { name: 'orders.retry.30s', delay: 30000 },
    { name: 'orders.retry.5m', delay: 300000 },
  ];

  async scheduleRetry(originalMessage: any, error: Error, attempt: number) {
    if (attempt >= this.retryTopics.length) {
      // Máximo de tentativas atingido, enviar para DLQ
      await this.sendToDLQ(originalMessage, error);
      return;
    }

    const retryTopic = this.retryTopics[attempt];
    const retryMessage = {
      ...originalMessage,
      headers: {
        ...originalMessage.headers,
        'retry-attempt': attempt.toString(),
        'retry-scheduled-at': Date.now().toString(),
        'original-error': error.message,
      },
    };

    // Agendar reprocessamento
    setTimeout(async () => {
      await this.producer.send({
        topic: retryTopic.name,
        messages: [retryMessage],
      });
    }, retryTopic.delay);
  }

  async sendToDLQ(message: any, error: Error) {
    await this.producer.send({
      topic: 'orders.dlq',
      messages: [{
        ...message,
        headers: {
          ...message.headers,
          'dlq-reason': error.message,
          'dlq-timestamp': Date.now().toString(),
        },
      }],
    });

    // Alertar equipe
    await this.alertingService.sendAlert({
      type: 'DLQ_MESSAGE',
      message: `Message sent to DLQ: ${error.message}`,
      orderId: message.orderId,
    });
  }
}
```

**Consumer com Retry**:
```typescript
@Injectable()
export class ResilientConsumerService {
  async processMessage(message: KafkaMessage) {
    try {
      await this.businessLogic(message);
    } catch (error) {
      const attempt = parseInt(message.headers['retry-attempt'] || '0');
      
      if (this.isRetryableError(error)) {
        await this.retryService.scheduleRetry(message, error, attempt + 1);
      } else {
        // Erro não-recuperável, enviar diretamente para DLQ
        await this.retryService.sendToDLQ(message, error);
      }
    }
  }

  private isRetryableError(error: Error): boolean {
    // Network errors, timeouts, etc.
    return error.message.includes('timeout') || 
           error.message.includes('connection') ||
           error.name === 'TemporaryError';
  }
}
```

**Critérios de Aceite**:
- [ ] Retry automático funcionando
- [ ] Delays progressivos respeitados
- [ ] DLQ recebendo mensagens problemáticas
- [ ] Alertas sendo disparados
- [ ] Dashboard mostrando estatísticas de retry

---

### Etapa 3.3 - Ensaios de Falha (Chaos Engineering)

**Objetivo**: Validar resiliência do sistema sob falhas

#### Microfases:
1. **Falhas de Serviço**
   - Derrubar payment-service temporariamente
   - Simular lentidão no inventory-service
   - Timeout no banco de dados

2. **Falhas de Schema**
   - Publicar evento com schema inválido
   - Testar compatibilidade backward/forward
   - Recuperação automática

3. **Falhas de Rede**
   - Latência alta entre serviços
   - Packet loss simulado
   - Partições de rede

**Scripts de Teste**:
```bash
#!/bin/bash
# chaos-tests.sh

echo "🔥 Iniciando testes de caos..."

# 1. Derrubar payment-service
echo "⏸️ Derrubando payment-service..."
docker compose stop payment-service
sleep 30

# Verificar acúmulo de lag
echo "📊 Verificando lag do consumer..."
docker compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group payment-service

# 2. Restartar serviço
echo "▶️ Restartando payment-service..."
docker compose start payment-service

# 3. Simular schema inválido
echo "🚫 Enviando evento com schema inválido..."
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"invalidField": "this should break"}'

# 4. Simular alta carga
echo "⚡ Simulando alta carga..."
for i in {1..100}; do
  curl -s -X POST http://localhost:3001/orders \
    -H "Content-Type: application/json" \
    -d '{"customerId": "load-test-'$i'", "items": [{"productId": "prod_1", "quantity": 1, "price": 10}]}' &
done
wait

echo "✅ Testes de caos concluídos"
```

**Monitoramento Durante Testes**:
```typescript
@Injectable()
export class ChaosMonitoringService {
  async runChaosTest(testName: string, testFunction: () => Promise<void>) {
    const startTime = Date.now();
    const metrics = {
      errors: 0,
      successes: 0,
      averageLatency: 0,
    };

    try {
      await testFunction();
      
      // Coletar métricas pós-teste
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      await this.reportChaosResults(testName, {
        ...metrics,
        duration,
        status: 'completed',
      });
      
    } catch (error) {
      await this.reportChaosResults(testName, {
        ...metrics,
        status: 'failed',
        error: error.message,
      });
    }
  }
}
```

**Critérios de Aceite**:
- [ ] Sistema se recupera após falha de serviço
- [ ] Mensagens não são perdidas durante falhas
- [ ] DLQ funciona corretamente com schemas inválidos
- [ ] Métricas mostram impacto e recuperação
- [ ] Alertas são disparados apropriadamente

---

### Etapa 3.4 - Observabilidade Avançada

**Objetivo**: Dashboards e alertas para operação

#### Microfases:
1. **Métricas Avançadas**
   - Lag por consumer group
   - Taxa de erro por serviço
   - Percentis de latência (p95, p99)
   - Throughput por tópico

2. **Dashboards Grafana**
   - Overview geral do cluster
   - Drill-down por serviço
   - Alertas visuais

3. **Alertas Automáticos**
   - Lag alto em consumer groups
   - Taxa de erro acima do limite
   - Serviços fora do ar

**Prometheus Queries**:
```yaml
# prometheus-rules.yml
groups:
  - name: kafka-alerts
    rules:
      - alert: HighConsumerLag
        expr: kafka_consumer_lag_sum > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High consumer lag detected"
          description: "Consumer group {{ $labels.group }} has lag of {{ $value }}"

      - alert: HighErrorRate
        expr: rate(kafka_consumer_errors_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in consumer"
          description: "Error rate is {{ $value }} per second"
```

**Dashboard Configuration**:
```json
{
  "dashboard": {
    "title": "Kafka E-commerce Monitoring",
    "panels": [
      {
        "title": "Orders per Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(kafka_producer_records_sent_total{topic='orders.new'}[1m]) * 60"
          }
        ]
      },
      {
        "title": "Consumer Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "kafka_consumer_lag_sum"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "(rate(orders_completed_total[5m]) / rate(orders_created_total[5m])) * 100"
          }
        ]
      }
    ]
  }
}
```

**Critérios de Aceite**:
- [ ] Dashboards funcionais no Grafana
- [ ] Alertas sendo disparados corretamente
- [ ] Métricas precisas e atualizadas
- [ ] Drill-down por serviço funcional

---

## 🔄 Fase 4 - Stream Processing Didático

### Etapa 4.1 - ksqlDB para Agregações

**Objetivo**: Processamento de streams em tempo real

#### Microfases:
1. **Setup ksqlDB**
   - Container e configuração
   - Conexão com Kafka cluster
   - Interface CLI e web

2. **Streams e Tables**
   - Stream de orders
   - Table de KPIs agregados
   - Windowing por tempo

3. **Queries em Tempo Real**
   - Contadores por status
   - Métricas de performance
   - Top produtos

**ksqlDB Queries**:
```sql
-- Criar stream de orders
CREATE STREAM orders_stream (
  orderId VARCHAR KEY,
  customerId VARCHAR,
  totalAmount DECIMAL(10,2),
  status VARCHAR,
  timestamp TIMESTAMP
) WITH (
  KAFKA_TOPIC='orders.new',
  VALUE_FORMAT='JSON',
  TIMESTAMP='timestamp'
);

-- Criar stream de eventos de pagamento
CREATE STREAM payments_stream (
  orderId VARCHAR KEY,
  amount DECIMAL(10,2),
  status VARCHAR,
  timestamp TIMESTAMP
) WITH (
  KAFKA_TOPIC='payments.approved',
  VALUE_FORMAT='JSON',
  TIMESTAMP='timestamp'
);

-- Agregações por janela de tempo
CREATE TABLE order_metrics_hourly AS
SELECT 
  TIMESTAMPTOSTRING(WINDOWSTART, 'HH:mm') as hour_start,
  COUNT(*) as total_orders,
  SUM(totalAmount) as total_revenue,
  AVG(totalAmount) as avg_order_value
FROM orders_stream 
WINDOW TUMBLING (SIZE 1 HOUR)
GROUP BY 1;

-- Top produtos por volume
CREATE TABLE top_products AS
SELECT 
  productId,
  COUNT(*) as order_count,
  SUM(quantity) as total_quantity
FROM orders_stream 
FLATTEN(items)
WINDOW TUMBLING (SIZE 1 DAY)
GROUP BY productId
HAVING COUNT(*) > 10;

-- KPIs em tempo real
CREATE TABLE live_kpis AS
SELECT 
  'global' as key,
  COUNT(*) as total_orders,
  COUNT_DISTINCT(customerId) as unique_customers,
  SUM(totalAmount) as total_revenue,
  AVG(totalAmount) as avg_order_value
FROM orders_stream 
WINDOW TUMBLING (SIZE 5 MINUTES)
GROUP BY 'global';
```

**Consumer para KPIs**:
```typescript
@Injectable()
export class KpiConsumerService {
  async consumeKpis() {
    await this.consumer.subscribe({ topics: ['LIVE_KPIS'] });
    
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const kpis = JSON.parse(message.value.toString());
        
        // Enviar para dashboard via WebSocket
        this.websocketService.broadcast('kpis.updated', kpis);
        
        // Salvar histórico
        await this.kpiRepository.save({
          timestamp: new Date(),
          totalOrders: kpis.TOTAL_ORDERS,
          uniqueCustomers: kpis.UNIQUE_CUSTOMERS,
          totalRevenue: kpis.TOTAL_REVENUE,
          avgOrderValue: kpis.AVG_ORDER_VALUE,
        });
      },
    });
  }
}
```

**Critérios de Aceite**:
- [ ] ksqlDB rodando e acessível
- [ ] Streams criados e populados
- [ ] Agregações funcionando corretamente
- [ ] KPIs atualizando no dashboard
- [ ] Queries interativas funcionais

---

### Etapa 4.2 - Joins e Enriquecimento

**Objetivo**: Combinar dados de múltiplas fontes

#### Microfases:
1. **Customer Data Stream**
   - Simular dados de clientes
   - CDC do PostgreSQL (Debezium)
   - Table de clientes

2. **Product Catalog Stream**
   - Dados de produtos
   - Preços e descrições
   - Atualizações em tempo real

3. **Stream Joins**
   - Orders + Customer data
   - Orders + Product data
   - Enriched events

**Setup Debezium (Opcional)**:
```yaml
# docker-compose.yml - Debezium connector
  debezium:
    image: debezium/connect:2.3
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: debezium
      CONFIG_STORAGE_TOPIC: debezium_configs
      OFFSET_STORAGE_TOPIC: debezium_offsets
      STATUS_STORAGE_TOPIC: debezium_status
    depends_on:
      - kafka
      - postgres
```

**ksqlDB Joins**:
```sql
-- Table de clientes
CREATE TABLE customers (
  customerId VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  tier VARCHAR, -- 'bronze', 'silver', 'gold'
  registrationDate TIMESTAMP
) WITH (
  KAFKA_TOPIC='customers',
  VALUE_FORMAT='JSON'
);

-- Table de produtos
CREATE TABLE products (
  productId VARCHAR PRIMARY KEY,
  name VARCHAR,
  category VARCHAR,
  price DECIMAL(10,2),
  updatedAt TIMESTAMP
) WITH (
  KAFKA_TOPIC='products',
  VALUE_FORMAT='JSON'
);

-- Stream enriquecido
CREATE STREAM enriched_orders AS
SELECT 
  o.orderId,
  o.customerId,
  c.name as customerName,
  c.email as customerEmail,
  c.tier as customerTier,
  o.totalAmount,
  o.timestamp,
  -- Enriquecer com dados do produto seria mais complexo
  -- devido à estrutura de array dos items
FROM orders_stream o
LEFT JOIN customers c ON o.customerId = c.customerId;

-- Análises por tier de cliente
CREATE TABLE revenue_by_tier AS
SELECT 
  customerTier,
  COUNT(*) as order_count,
  SUM(totalAmount) as total_revenue,
  AVG(totalAmount) as avg_order_value
FROM enriched_orders 
WINDOW TUMBLING (SIZE 1 HOUR)
GROUP BY customerTier;
```

**Critérios de Aceite**:
- [ ] Dados de clientes sendo capturados
- [ ] Joins funcionando corretamente
- [ ] Eventos enriquecidos sendo produzidos
- [ ] Análises por segmento de cliente
- [ ] Performance aceitável

---

## 🎨 Fase 5 - Polimento e Extensões

### Etapa 5.1 - Segurança Básica

**Objetivo**: Implementar autenticação e autorização básica

#### Microfases:
1. **SASL/PLAIN**
   - Autenticação no Kafka
   - Usuários e senhas
   - ACLs básicas

2. **API Authentication**
   - JWT tokens
   - Rate limiting
   - Validation middleware

3. **Secrets Management**
   - Environment variables
   - Docker secrets
   - Rotation básica

**Kafka Security Config**:
```yaml
# docker-compose.yml
  kafka:
    environment:
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,SASL_PLAINTEXT:SASL_PLAINTEXT
      KAFKA_LISTENERS: PLAINTEXT://localhost:9092,SASL_PLAINTEXT://localhost:9093
      KAFKA_SASL_ENABLED_MECHANISMS: PLAIN
      KAFKA_SASL_MECHANISM_INTER_BROKER_PROTOCOL: PLAIN
      KAFKA_OPTS: "-Djava.security.auth.login.config=/etc/kafka/kafka_server_jaas.conf"
    volumes:
      - ./config/kafka_server_jaas.conf:/etc/kafka/kafka_server_jaas.conf
```

**JAAS Configuration**:
```
// kafka_server_jaas.conf
KafkaServer {
  org.apache.kafka.common.security.plain.PlainLoginModule required
  username="admin"
  password="admin-secret"
  user_admin="admin-secret"
  user_checkout="checkout-secret"
  user_payment="payment-secret";
};
```

**Client Authentication**:
```typescript
// Client com SASL
const kafka = new Kafka({
  clientId: 'checkout-api',
  brokers: ['localhost:9093'],
  sasl: {
    mechanism: 'plain',
    username: 'checkout',
    password: process.env.KAFKA_PASSWORD,
  },
});
```

**Critérios de Aceite**:
- [ ] Autenticação SASL funcionando
- [ ] ACLs configuradas por serviço
- [ ] APIs protegidas com JWT
- [ ] Secrets externalizados

---

### Etapa 5.2 - Experiências Didáticas

**Objetivo**: Demonstrações interativas de conceitos Kafka

#### Microfases:
1. **Partitioning Demo**
   - Interface para alterar número de partições
   - Visualizar distribuição de mensagens
   - Impacto na ordenação

2. **Consumer Group Demo**
   - Adicionar/remover consumidores
   - Visualizar rebalanceamento
   - Lag por partição

3. **Schema Evolution Demo**
   - Evoluir schema em tempo real
   - Testar compatibilidade
   - Mostrar erros de incompatibilidade

**Partition Visualization**:
```tsx
// PartitionDemo.tsx
export const PartitionDemo: React.FC = () => {
  const [partitions, setPartitions] = useState(3);
  const [messages, setMessages] = useState<Message[]>([]);

  const sendTestMessage = async (key: string) => {
    const partition = hash(key) % partitions;
    
    await fetch('/api/demo/send', {
      method: 'POST',
      body: JSON.stringify({ key, partition, timestamp: Date.now() }),
    });
  };

  return (
    <div className="partition-demo">
      <div className="controls">
        <label>Partições: 
          <input 
            type="number" 
            value={partitions}
            onChange={(e) => setPartitions(Number(e.target.value))}
          />
        </label>
        <button onClick={() => sendTestMessage(randomKey())}>
          Enviar Mensagem
        </button>
      </div>
      
      <div className="partitions-view">
        {Array.from({ length: partitions }, (_, i) => (
          <PartitionView 
            key={i}
            partitionId={i}
            messages={messages.filter(m => m.partition === i)}
          />
        ))}
      </div>
    </div>
  );
};
```

**Consumer Group Visualization**:
```tsx
// ConsumerGroupDemo.tsx
export const ConsumerGroupDemo: React.FC = () => {
  const [consumers, setConsumers] = useState(2);
  const { partitionAssignment } = useConsumerGroupState();

  const addConsumer = () => {
    fetch('/api/demo/consumers', {
      method: 'POST',
      body: JSON.stringify({ action: 'add' }),
    });
  };

  const removeConsumer = () => {
    fetch('/api/demo/consumers', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove' }),
    });
  };

  return (
    <div className="consumer-group-demo">
      <div className="controls">
        <button onClick={addConsumer}>Adicionar Consumer</button>
        <button onClick={removeConsumer}>Remover Consumer</button>
      </div>
      
      <div className="assignment-view">
        {partitionAssignment.map(assignment => (
          <ConsumerAssignmentView 
            key={assignment.consumerId}
            consumerId={assignment.consumerId}
            partitions={assignment.partitions}
            lag={assignment.lag}
          />
        ))}
      </div>
    </div>
  );
};
```

**Critérios de Aceite**:
- [ ] Demo de particionamento funcional
- [ ] Visualização de consumer groups
- [ ] Schema evolution interativa
- [ ] Documentação dos conceitos
- [ ] Interface intuitiva

---

### Etapa 5.3 - Documentação e Guias

**Objetivo**: Documentação completa para operação e aprendizado

#### Microfases:
1. **Runbooks Operacionais**
   - Como reprocessar DLQ
   - Troubleshooting comum
   - Procedimentos de emergência

2. **Guias de Aprendizado**
   - Conceitos Kafka explicados
   - Exercícios práticos
   - Cenários de teste

3. **API Documentation**
   - Swagger/OpenAPI
   - Exemplos de payload
   - Códigos de erro

**Reprocessamento de DLQ**:
```bash
#!/bin/bash
# scripts/reprocess-dlq.sh

echo "🔄 Iniciando reprocessamento de DLQ..."

# 1. Verificar mensagens na DLQ
echo "📊 Verificando mensagens na DLQ..."
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders.dlq \
  --from-beginning \
  --max-messages 10

# 2. Confirmar reprocessamento
read -p "Deseja reprocessar todas as mensagens? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
  echo "Cancelado."
  exit 0
fi

# 3. Copiar DLQ para tópico de reprocessamento
echo "📤 Copiando mensagens para reprocessamento..."
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders.dlq \
  --from-beginning | \
docker compose exec -T kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic orders.reprocess

# 4. Limpar DLQ após confirmação
read -p "Limpar DLQ após reprocessamento? (y/N): " clear_dlq
if [[ $clear_dlq == [yY] ]]; then
  docker compose exec kafka kafka-topics \
    --bootstrap-server localhost:9092 \
    --delete --topic orders.dlq
  
  docker compose exec kafka kafka-topics \
    --bootstrap-server localhost:9092 \
    --create --topic orders.dlq \
    --partitions 1 --replication-factor 1
fi

echo "✅ Reprocessamento concluído!"
```

**Troubleshooting Guide**:
```markdown
# Guia de Troubleshooting

## Problemas Comuns

### Consumer Lag Alto
**Sintomas**: Mensagens acumulando, processamento lento
**Diagnóstico**:
```bash
# Verificar lag por grupo
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group payment-service
```

**Soluções**:
1. Aumentar número de consumers
2. Otimizar processamento
3. Verificar bottlenecks no banco

### Mensagens na DLQ
**Sintomas**: Alertas de DLQ, eventos não processados
**Diagnóstico**:
```bash
# Ver últimas mensagens na DLQ
kafka-console-consumer --bootstrap-server localhost:9092 --topic orders.dlq --from-beginning
```

**Soluções**:
1. Investigar causa raiz no log
2. Corrigir schema se necessário
3. Reprocessar usando script
```

**Critérios de Aceite**:
- [ ] Documentação completa e atualizada
- [ ] Scripts de operação testados
- [ ] Guias de troubleshooting práticos
- [ ] API documentation gerada
- [ ] Exercícios práticos funcionais

---

## 📊 Métricas de Sucesso e Validação

### Critérios Globais de Sucesso

1. **Funcional**:
   - [ ] Fluxo completo de pedido funcionando (checkout → confirmação)
   - [ ] Taxa de sucesso > 95% em condições normais
   - [ ] Tempo médio de processamento < 10 segundos
   - [ ] Zero perda de mensagens

2. **Didático**:
   - [ ] Dashboard visual mostrando fluxo em tempo real
   - [ ] Conceitos Kafka claramente demonstrados
   - [ ] Documentação compreensível para iniciantes
   - [ ] Exercícios práticos funcionais

3. **Operacional**:
   - [ ] Observabilidade completa (métricas + logs + alertas)
   - [ ] Recuperação automática de falhas temporárias
   - [ ] DLQ funcionando para casos irrecuperáveis
   - [ ] Scripts de operação testados

4. **Técnico**:
   - [ ] Código limpo e bem estruturado
   - [ ] Testes automatizados cobrindo cenários críticos
   - [ ] Configurações externalizadas
   - [ ] Performance aceitável para fins didáticos

---

## 🗓️ Roadmap de Entrega

### Estimativas de Esforço

| Fase | Estimativa | MVP |
|------|------------|-----|
| **Fase 0** - Infraestrutura | 2-3 dias | ✅ Essencial |
| **Fase 1** - Producer/Consumer | 3-4 dias | ✅ Essencial |
| **Fase 2** - Orquestração | 4-5 dias | ✅ Essencial |
| **Fase 3** - Robustez | 3-4 dias | 🔶 Recomendado |
| **Fase 4** - Stream Processing | 2-3 dias | 🔶 Avançado |
| **Fase 5** - Polimento | 2-3 dias | 🔶 Opcional |

**Total**: 16-22 dias de desenvolvimento

### Marcos Importantes

1. **MVP Didático** (Fases 0-2): Sistema funcional com visualização
2. **MVP Robusto** (Fases 0-3): Produção-ready com observabilidade
3. **MVP Avançado** (Fases 0-4): Stream processing e análises
4. **Versão Completa** (Fases 0-5): Todos os recursos e polimento

### Ordem Recomendada

1. **Semana 1**: Fase 0 + Fase 1 (Fundação sólida)
2. **Semana 2**: Fase 2 (Fluxo completo)
3. **Semana 3**: Fase 3 (Robustez)
4. **Semana 4**: Fase 4 + Fase 5 (Recursos avançados)

---

## 🎯 Como Validar Cada Fase

### Checklist Geral por Fase

**Fase 0 - Validação**:
```bash
# Verificar se tudo está rodando
docker compose ps
curl http://localhost:8080  # Kafka UI
curl http://localhost:3000  # Grafana
```

**Fase 1 - Validação**:
```bash
# Testar fluxo básico
curl -X POST http://localhost:3001/orders -d '{"customerId":"test","items":[{"productId":"prod1","quantity":1,"price":10}]}'
# Verificar no Kafka UI se mensagem chegou
# Verificar no dashboard se evento apareceu
```

**Fase 2 - Validação**:
```bash
# Testar fluxo completo
./scripts/test-complete-flow.sh
# Verificar no dashboard timeline completa
# Verificar métricas de sucesso
```

**Fase 3 - Validação**:
```bash
# Testes de caos
./scripts/chaos-tests.sh
# Verificar recuperação
# Verificar DLQ funcionando
```

**Fase 4 - Validação**:
```bash
# Verificar agregações ksqlDB
ksql http://localhost:8088
SELECT * FROM live_kpis;
```

**Fase 5 - Validação**:
```bash
# Testar com autenticação
# Verificar demos interativas
# Validar documentação
```

---

## 📝 Próximos Passos

1. **Revisar e Aprovar Plano**: Validar escopo e estimativas
2. **Setup Inicial**: Começar com Fase 0
3. **Desenvolvimento Iterativo**: Uma fase por vez com validação
4. **Feedback Contínuo**: Ajustar didática conforme necessário
5. **Documentação Paralela**: Manter docs atualizadas durante desenvolvimento

Este plano fornece uma estrutura sólida para criar um sistema de e-commerce didático que demonstra efetivamente os conceitos e operações do Apache Kafka, combinando aspectos práticos do dia a dia com uma abordagem visual e educativa.
