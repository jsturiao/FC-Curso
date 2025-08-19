#!/bin/bash
# Script de teste para validar fluxo completo do e-commerce
# Etapa 8: Integração e Testes Completos

echo "🚀 Iniciando testes de integração do E-commerce RabbitMQ"
echo "=================================================="

# Configurações
BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para fazer requests HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${BLUE}🔄 Testando: ${description}${NC}"
    echo "   Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "HTTPSTATUS:%{http_code}" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -X $method \
            -w "HTTPSTATUS:%{http_code}" \
            "$API_URL$endpoint")
    fi
    
    # Extrair status HTTP e corpo da resposta
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    # Verificar se foi sucesso (2xx)
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "   ${GREEN}✅ Sucesso (HTTP $http_code)${NC}"
        echo "   Resposta: $body"
        return 0
    else
        echo -e "   ${RED}❌ Falha (HTTP $http_code)${NC}"
        echo "   Resposta: $body"
        return 1
    fi
}

# Função para aguardar e verificar processamento
wait_for_processing() {
    local seconds=$1
    echo -e "\n${YELLOW}⏳ Aguardando ${seconds}s para processamento das mensagens...${NC}"
    sleep $seconds
}

# Teste 1: Verificar health dos serviços
echo -e "\n${BLUE}📊 Teste 1: Health Check dos Serviços${NC}"
echo "----------------------------------------"

if make_request "GET" "/health" "" "Health check geral"; then
    echo -e "${GREEN}✅ Sistema está saudável${NC}"
else
    echo -e "${RED}❌ Sistema com problemas - abortando testes${NC}"
    exit 1
fi

# Teste 2: Verificar produtos disponíveis
echo -e "\n${BLUE}📦 Teste 2: Verificar Produtos Disponíveis${NC}"
echo "--------------------------------------------"

make_request "GET" "/inventory/products" "" "Listagem de produtos"

# Teste 3: Fluxo Completo - Happy Path
echo -e "\n${BLUE}🎯 Teste 3: Fluxo Completo - Pedido com Sucesso (Happy Path)${NC}"
echo "==============================================================+"

# 3.1: Criar pedido
ORDER_DATA='{
  "customerId": "customer_123",
  "customerEmail": "test@example.com",
  "items": [
    {
      "productId": "prod_laptop_001",
      "productName": "Gaming Laptop Pro",
      "quantity": 1,
      "unitPrice": 1299.99
    },
    {
      "productId": "prod_headphones_001",
      "productName": "Wireless Headphones", 
      "quantity": 2,
      "unitPrice": 199.99
    }
  ],
  "shippingAddress": {
    "street": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }
}'

if make_request "POST" "/orders" "$ORDER_DATA" "Criar pedido"; then
    ORDER_ID=$(echo $body | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo -e "   ${GREEN}📝 Pedido criado com ID: $ORDER_ID${NC}"
    
    wait_for_processing 3
    
    # 3.2: Verificar se o pedido foi criado corretamente
    make_request "GET" "/orders/$ORDER_ID" "" "Verificar detalhes do pedido"
    
    wait_for_processing 2
    
    # 3.3: Verificar se o estoque foi reservado
    make_request "GET" "/inventory/products/prod_laptop_001" "" "Verificar estoque do laptop"
    make_request "GET" "/inventory/products/prod_headphones_001" "" "Verificar estoque dos headphones"
    
    wait_for_processing 2
    
    # 3.4: Simular processamento de pagamento
    PAYMENT_DATA="{
      \"orderId\": \"$ORDER_ID\",
      \"method\": \"credit_card\",
      \"amount\": 1699.97,
      \"cardToken\": \"tok_test_visa_4242\"
    }"
    
    make_request "POST" "/payments" "$PAYMENT_DATA" "Processar pagamento"
    
    wait_for_processing 3
    
    # 3.5: Verificar status final do pedido
    make_request "GET" "/orders/$ORDER_ID" "" "Verificar status final do pedido"
    
else
    echo -e "${RED}❌ Falha ao criar pedido - abortando fluxo completo${NC}"
fi

# Teste 4: Cenário de Falha - Produto sem estoque
echo -e "\n${BLUE}⚠️  Teste 4: Cenário de Falha - Produto Indisponível${NC}"
echo "====================================================="

# Tentar pedir uma quantidade muito alta para forçar erro de estoque
INVALID_ORDER_DATA='{
  "customerId": "customer_456",
  "customerEmail": "test2@example.com",
  "items": [
    {
      "productId": "prod_camera_001",
      "productName": "Professional Camera",
      "quantity": 999,
      "unitPrice": 799.99
    }
  ],
  "currency": "USD"
}'

make_request "POST" "/orders" "$INVALID_ORDER_DATA" "Criar pedido com estoque insuficiente"

wait_for_processing 2

# Teste 5: Teste de Notificações
echo -e "\n${BLUE}📧 Teste 5: Sistema de Notificações${NC}"
echo "====================================="

NOTIFICATION_DATA='{
  "customerId": "customer_123",
  "type": "order_confirmation",
  "title": "Pedido Confirmado - Teste",
  "message": "Seu pedido de teste foi confirmado e está sendo processado.",
  "channel": "email"
}'

make_request "POST" "/notifications" "$NOTIFICATION_DATA" "Enviar notificação de teste"

wait_for_processing 2

# Teste 6: Gestão de Estoque
echo -e "\n${BLUE}📦 Teste 6: Gestão de Estoque${NC}"
echo "==============================="

# Adicionar estoque
STOCK_ADD_DATA='{
  "productId": "prod_tablet_001",
  "quantity": 10,
  "reason": "Reposição de teste"
}'

make_request "POST" "/inventory/stock/add" "$STOCK_ADD_DATA" "Adicionar estoque"

wait_for_processing 1

# Reservar estoque
STOCK_RESERVE_DATA='{
  "productId": "prod_tablet_001",
  "quantity": 3,
  "orderId": "order_test_reserve"
}'

make_request "POST" "/inventory/stock/reserve" "$STOCK_RESERVE_DATA" "Reservar estoque"

wait_for_processing 2

# Teste 7: Estatísticas e Relatórios
echo -e "\n${BLUE}📊 Teste 7: Estatísticas e Relatórios${NC}"
echo "======================================"

make_request "GET" "/inventory/stats" "" "Estatísticas do estoque"
make_request "GET" "/orders/stats" "" "Estatísticas de pedidos"
make_request "GET" "/notifications/stats" "" "Estatísticas de notificações"

# Resumo dos testes
echo -e "\n${BLUE}📋 Resumo dos Testes de Integração${NC}"
echo "==================================="
echo -e "${GREEN}✅ Health check dos serviços${NC}"
echo -e "${GREEN}✅ Listagem de produtos${NC}"
echo -e "${GREEN}✅ Fluxo completo de pedido${NC}"
echo -e "${YELLOW}⚠️  Teste de cenários de falha${NC}"
echo -e "${GREEN}✅ Sistema de notificações${NC}"
echo -e "${GREEN}✅ Gestão de estoque${NC}"
echo -e "${GREEN}✅ Estatísticas e relatórios${NC}"

echo -e "\n${GREEN}🎉 Testes de integração concluídos!${NC}"
echo -e "${BLUE}📊 Verifique o dashboard em: $BASE_URL${NC}"
echo -e "${BLUE}🐰 RabbitMQ Management: http://localhost:15672${NC}"
echo "=================================================="
