#!/bin/bash
# demo-happy-path.sh - Demonstração do fluxo normal

echo "🎬 Starting Happy Path Demo..."

# 1. Create order
echo "📦 Creating order..."
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "demo-customer-1",
    "customerEmail": "demo@example.com",
    "items": [
      {
        "productId": "demo-product-1", 
        "productName": "Demo Product",
        "quantity": 2, 
        "unitPrice": 29.99
      }
    ]
  }')

echo "Response: $ORDER_RESPONSE"

if command -v jq > /dev/null; then
    ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.data.id // "unknown"')
    echo "✅ Order created: $ORDER_ID"
    
    # 2. Wait for processing
    echo "⏳ Waiting for processing..."
    sleep 3
    
    # 3. Check order status
    echo "🔍 Checking order status..."
    curl -s http://localhost:3000/api/orders/$ORDER_ID | jq '.data.status // "unknown"'
    
    # 4. Show statistics
    echo "📊 Current statistics:"
    curl -s http://localhost:3000/api/stats | jq '.'
else
    echo "✅ Order created (jq not available for parsing)"
    echo "📊 Current statistics:"
    curl -s http://localhost:3000/api/stats
fi

echo "🎉 Happy Path Demo completed!"
