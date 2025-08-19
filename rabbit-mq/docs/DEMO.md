# 📹 Demo Script - E-commerce RabbitMQ

Este documento contém scripts e instruções para criar demonstrações do sistema.

## 🎥 Cenários de Demonstração

### 1. **Happy Path Demo** (Fluxo Normal)

#### Passos para Demonstração:
1. **Abrir Dashboard Principal**: http://localhost:3000
2. **Mostrar Status Inicial**: Filas vazias, estatísticas zeradas
3. **Criar Pedido via API**:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "demo-customer",
    "items": [
      {"productId": "demo-product", "quantity": 2, "price": 29.99}
    ]
  }'
```
4. **Observar Dashboard**: Visualizar eventos em tempo real
5. **Verificar Resultado**: Pedido processado com sucesso

#### Script Automático:
```bash
#!/bin/bash
# demo-happy-path.sh

echo "🎬 Starting Happy Path Demo..."

# 1. Create order
echo "📦 Creating order..."
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "demo-customer-1",
    "items": [
      {"productId": "demo-product-1", "quantity": 2, "price": 29.99}
    ]
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.data.id')
echo "✅ Order created: $ORDER_ID"

# 2. Wait for processing
echo "⏳ Waiting for processing..."
sleep 3

# 3. Check order status
echo "🔍 Checking order status..."
curl -s http://localhost:3000/api/orders/$ORDER_ID | jq '.data.status'

# 4. Show statistics
echo "📊 Current statistics:"
curl -s http://localhost:3000/api/stats | jq '.'

echo "🎉 Happy Path Demo completed!"
```

### 2. **Error Handling Demo** (DLQ Flow)

#### Cenário: Simular Falha de Pagamento
```bash
#!/bin/bash
# demo-error-handling.sh

echo "🎬 Starting Error Handling Demo..."

# 1. Create order that will fail payment
echo "📦 Creating order with payment failure..."
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "error-customer",
    "items": [
      {"productId": "invalid-payment-product", "quantity": 1, "price": 999.99}
    ]
  }'

# 2. Wait for retry attempts
echo "⏳ Waiting for retry attempts..."
sleep 10

# 3. Check DLQ status
echo "🚨 Checking DLQ status..."
curl -s http://localhost:3000/api/dlq/stats | jq '.'

# 4. Show DLQ messages
echo "📋 DLQ Messages:"
curl -s http://localhost:3000/api/dlq/messages | jq '.data'

echo "🎯 Error Handling Demo completed!"
```

### 3. **Real-time Dashboard Demo**

#### Passos Manuais:
1. **Abrir Dashboard**: http://localhost:3000
2. **Abrir Console do Navegador**: F12
3. **Executar Script de Carga**:
```javascript
// Browser console script
async function generateLoad() {
  console.log('🚀 Starting load generation...');
  
  for (let i = 0; i < 10; i++) {
    const order = {
      customerId: `load-customer-${i}`,
      items: [
        {
          productId: `product-${Math.floor(Math.random() * 5) + 1}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.round((Math.random() * 50 + 10) * 100) / 100
        }
      ]
    };
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      
      const result = await response.json();
      console.log(`✅ Order ${i + 1} created:`, result.data.id);
      
      // Wait 1 second between orders
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error creating order ${i + 1}:`, error);
    }
  }
  
  console.log('🎉 Load generation completed!');
}

// Run the load generation
generateLoad();
```

## 📸 Screenshots para Documentação

### 1. Dashboard Principal
**URL**: http://localhost:3000
**Elementos a capturar**:
- Header com título e timestamp
- Cards de estatísticas
- Fluxo de mensagens visual
- Timeline de eventos
- Status das filas

### 2. Error Dashboard
**URL**: http://localhost:3000/dlq.html
**Elementos a capturar**:
- Estatísticas de DLQ
- Lista de mensagens falhadas
- Filtros de busca
- Modal de detalhes da mensagem
- Ações em lote

### 3. RabbitMQ Management
**URL**: http://localhost:15672
**Credentials**: rabbitmq / rabbitmq
**Elementos a capturar**:
- Overview dashboard
- Exchanges tab
- Queues tab
- Connections tab

## 🎬 Video Recording Setup

### Tools Recomendadas:
- **OBS Studio** (gratuito, multi-plataforma)
- **ScreenToGif** (Windows, para GIFs)
- **LICEcap** (macOS, para GIFs)
- **Kazam** (Linux)

### Recording Settings:
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 FPS
- **Audio**: Optional (voice-over explaining steps)
- **Duration**: 2-5 minutes per scenario

### Video Structure:
1. **Intro** (10s): Show project overview
2. **Setup** (20s): Show services running
3. **Demo** (2-3min): Execute scenario
4. **Results** (20s): Show final state
5. **Outro** (10s): Summary and next steps

## 📝 Demo Scripts Collection

### Complete System Demo
```bash
#!/bin/bash
# complete-demo.sh

echo "🎬 E-commerce RabbitMQ Complete Demo"
echo "=================================="

# Check if services are running
echo "🔍 Checking services..."
curl -s http://localhost:3000/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Application is running"
else
    echo "❌ Application is not running. Please start with: docker compose up"
    exit 1
fi

# Reset state (optional)
echo "🔄 Resetting demo state..."
# Add reset commands if needed

# Demo 1: Happy Path
echo ""
echo "📊 Demo 1: Happy Path Flow"
echo "-------------------------"
./demo-happy-path.sh

sleep 2

# Demo 2: Error Handling
echo ""
echo "🚨 Demo 2: Error Handling"
echo "------------------------"
./demo-error-handling.sh

sleep 2

# Demo 3: Statistics
echo ""
echo "📈 Demo 3: Final Statistics"
echo "-------------------------"
echo "Orders:"
curl -s http://localhost:3000/api/orders/stats | jq '.'

echo ""
echo "Payments:"
curl -s http://localhost:3000/api/payments/stats | jq '.'

echo ""
echo "DLQ Status:"
curl -s http://localhost:3000/api/dlq/stats | jq '.'

echo ""
echo "🎉 Complete Demo finished!"
echo "📊 Visit http://localhost:3000 to see the dashboard"
echo "🚨 Visit http://localhost:3000/dlq.html to see error dashboard"
```

### Load Testing Demo
```bash
#!/bin/bash
# load-test-demo.sh

echo "🚀 Load Testing Demo"
echo "==================="

# Function to create order
create_order() {
    local customer_id="load-customer-$1"
    local product_id="product-$(( $RANDOM % 5 + 1 ))"
    local quantity=$(( $RANDOM % 3 + 1 ))
    local price=$(echo "scale=2; ($RANDOM % 40 + 10) / 1" | bc)
    
    curl -s -X POST http://localhost:3000/api/orders \
        -H "Content-Type: application/json" \
        -d "{
            \"customerId\": \"$customer_id\",
            \"items\": [{
                \"productId\": \"$product_id\",
                \"quantity\": $quantity,
                \"price\": $price
            }]
        }" > /dev/null
        
    echo "📦 Order $1 created (Customer: $customer_id, Product: $product_id)"
}

# Create orders in parallel
echo "🏃‍♂️ Creating 20 orders in parallel..."
for i in {1..20}; do
    create_order $i &
done

# Wait for all orders to complete
wait

echo "⏳ Waiting for processing..."
sleep 5

# Show results
echo "📊 Load test results:"
curl -s http://localhost:3000/api/stats | jq '.'

echo "🎉 Load test completed!"
```

## 🎨 UI/UX Demo Points

### Dashboard Features to Highlight:
1. **Real-time Updates**: WebSocket connection indicator
2. **Visual Flow**: Message flow animation
3. **Statistics Cards**: Live counters
4. **Timeline**: Event history
5. **Queue Monitoring**: RabbitMQ integration

### Error Dashboard Features:
1. **Error Visualization**: Failed message cards
2. **Filtering**: By status, queue, error type
3. **Bulk Actions**: Multi-select operations
4. **Message Details**: Modal with full context
5. **Reprocessing**: Manual recovery workflow

## 📊 Performance Benchmarks

### Metrics to Demonstrate:
- **Throughput**: Orders/second
- **Latency**: End-to-end processing time
- **Reliability**: Success rate with retries
- **Recovery**: DLQ message reprocessing

### Benchmark Script:
```bash
#!/bin/bash
# benchmark.sh

echo "📊 Performance Benchmark"
echo "======================="

START_TIME=$(date +%s)

# Create 100 orders
for i in {1..100}; do
    curl -s -X POST http://localhost:3000/api/orders \
        -H "Content-Type: application/json" \
        -d "{
            \"customerId\": \"bench-customer-$i\",
            \"items\": [{
                \"productId\": \"bench-product\",
                \"quantity\": 1,
                \"price\": 10.00
            }]
        }" > /dev/null
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "⏱️  Time taken: ${DURATION} seconds"
echo "🚀 Throughput: $(echo "scale=2; 100 / $DURATION" | bc) orders/second"

# Wait for processing
sleep 10

# Check success rate
TOTAL_ORDERS=$(curl -s http://localhost:3000/api/orders/stats | jq '.data.total')
COMPLETED_ORDERS=$(curl -s http://localhost:3000/api/orders/stats | jq '.data.byStatus.completed // 0')
SUCCESS_RATE=$(echo "scale=2; ($COMPLETED_ORDERS * 100) / $TOTAL_ORDERS" | bc)

echo "✅ Success rate: ${SUCCESS_RATE}%"
```

---

## 🎯 Demo Checklist

### Pre-Demo Setup:
- [ ] All services running (`docker compose up`)
- [ ] Clean state (no previous demo data)
- [ ] Browser windows positioned
- [ ] Recording software configured
- [ ] Scripts executable (`chmod +x *.sh`)

### During Demo:
- [ ] Explain architecture briefly
- [ ] Show dashboard first
- [ ] Execute scenarios step by step
- [ ] Highlight real-time updates
- [ ] Demonstrate error handling
- [ ] Show recovery workflow

### Post-Demo:
- [ ] Save recordings to `demos/` folder
- [ ] Create GIFs for README
- [ ] Document any issues found
- [ ] Update demo scripts if needed

---

**📹 Demo Version**: 1.0.0  
**📅 Last Updated**: August 19, 2025
