#!/bin/bash
# Script simples para testar endpoints disponíveis

echo "🔍 Testando endpoints disponíveis..."

BASE_URL="http://localhost:3000"

echo -e "\n📊 Health Check:"
curl -s "$BASE_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"

echo -e "\n📈 Stats:"
curl -s "$BASE_URL/api/stats" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/stats"

echo -e "\n🛠️ EventBus Status:"
curl -s "$BASE_URL/api/eventbus/status" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/eventbus/status"

echo -e "\n📦 Testando vários caminhos para produtos:"
echo "1. /api/products:"
curl -s "$BASE_URL/api/products" || echo "❌ Falhou"

echo -e "\n2. /api/inventory/products:"
curl -s "$BASE_URL/api/inventory/products" || echo "❌ Falhou"

echo -e "\n3. /inventory/products:"
curl -s "$BASE_URL/inventory/products" || echo "❌ Falhou"

echo -e "\n4. /products:"
curl -s "$BASE_URL/products" || echo "❌ Falhou"

echo -e "\n🎯 Testando Orders:"
curl -s "$BASE_URL/api/orders" || echo "❌ Falhou"

echo -e "\n💳 Testando Payments:"
curl -s "$BASE_URL/api/payments" || echo "❌ Falhou"

echo -e "\n📧 Testando Notifications:"
curl -s "$BASE_URL/api/notifications" || echo "❌ Falhou"

echo -e "\n✅ Teste de endpoints concluído!"
