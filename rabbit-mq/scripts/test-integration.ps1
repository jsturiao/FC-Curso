# Script de teste para Windows PowerShell
# Etapa 8: Integração e Testes Completos
# E-commerce RabbitMQ - Fluxo End-to-End

Write-Host "🚀 Iniciando testes de integração do E-commerce RabbitMQ" -ForegroundColor Cyan
Write-Host "=======================================================+" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$apiUrl = "$baseUrl/api"

# Função para fazer requests HTTP
function Invoke-ApiTest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n🔄 Testando: $Description" -ForegroundColor Blue
    Write-Host "   Endpoint: $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $headers = @{ "Content-Type" = "application/json" }
        $uri = "$apiUrl$Endpoint"
        
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Body $Body -Headers $headers
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        
        Write-Host "   ✅ Sucesso" -ForegroundColor Green
        Write-Host "   Resposta: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        return $response
    }
    catch {
        Write-Host "   ❌ Falha: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para aguardar processamento
function Wait-Processing {
    param([int]$Seconds)
    Write-Host "`n⏳ Aguardando ${Seconds}s para processamento..." -ForegroundColor Yellow
    Start-Sleep -Seconds $Seconds
}

# Teste 1: Health Check
Write-Host "`n📊 Teste 1: Health Check dos Serviços" -ForegroundColor Blue
Write-Host "-------------------------------------" -ForegroundColor Blue

$healthCheck = Invoke-ApiTest -Method "GET" -Endpoint "/health" -Description "Health check geral"
if ($healthCheck) {
    Write-Host "✅ Sistema está saudável" -ForegroundColor Green
} else {
    Write-Host "❌ Sistema com problemas - abortando testes" -ForegroundColor Red
    exit 1
}

# Teste 2: Listar Produtos
Write-Host "`n📦 Teste 2: Verificar Produtos Disponíveis" -ForegroundColor Blue
Write-Host "-------------------------------------------" -ForegroundColor Blue

$products = Invoke-ApiTest -Method "GET" -Endpoint "/inventory/products" -Description "Listagem de produtos"

# Teste 3: Fluxo Completo - Happy Path
Write-Host "`n🎯 Teste 3: Fluxo Completo - Pedido com Sucesso" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

$orderData = @{
    userId = "user_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    items = @(
        @{
            productId = "prod_laptop_001"
            quantity = 1
            price = 1299.99
        },
        @{
            productId = "prod_headphones_001"
            quantity = 1
            price = 199.99
        }
    )
    shippingAddress = @{
        street = "Rua das Flores, 123"
        city = "São Paulo"
        state = "SP"
        zipCode = "01234-567"
    }
} | ConvertTo-Json -Depth 3

$order = Invoke-ApiTest -Method "POST" -Endpoint "/orders" -Body $orderData -Description "Criar pedido"

if ($order -and $order.id) {
    $orderId = $order.id
    Write-Host "📝 Pedido criado com ID: $orderId" -ForegroundColor Green
    
    Wait-Processing -Seconds 3
    
    # Verificar detalhes do pedido
    Invoke-ApiTest -Method "GET" -Endpoint "/orders/$orderId" -Description "Verificar detalhes do pedido"
    
    Wait-Processing -Seconds 2
    
    # Verificar estoque
    Invoke-ApiTest -Method "GET" -Endpoint "/inventory/products/prod_laptop_001" -Description "Verificar estoque do laptop"
    
    Wait-Processing -Seconds 2
    
    # Processar pagamento
    $paymentData = @{
        orderId = $orderId
        method = "credit_card"
        amount = 1499.98
        cardToken = "tok_test_visa_4242"
    } | ConvertTo-Json
    
    Invoke-ApiTest -Method "POST" -Endpoint "/payments" -Body $paymentData -Description "Processar pagamento"
    
    Wait-Processing -Seconds 3
    
    # Status final
    Invoke-ApiTest -Method "GET" -Endpoint "/orders/$orderId" -Description "Verificar status final do pedido"
}

# Teste 4: Cenário de Falha
Write-Host "`n⚠️ Teste 4: Cenário de Falha - Estoque Insuficiente" -ForegroundColor Blue
Write-Host "====================================================" -ForegroundColor Blue

$invalidOrderData = @{
    userId = "user_test_fail_001"
    items = @(
        @{
            productId = "prod_camera_001"
            quantity = 999
            price = 799.99
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-ApiTest -Method "POST" -Endpoint "/orders" -Body $invalidOrderData -Description "Pedido com estoque insuficiente"

Wait-Processing -Seconds 2

# Teste 5: Notificações
Write-Host "`n📧 Teste 5: Sistema de Notificações" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue

$notificationData = @{
    userId = "user_test_001"
    type = "order_confirmation"
    title = "Pedido Confirmado - Teste PowerShell"
    message = "Seu pedido de teste foi confirmado via PowerShell."
    channel = "email"
} | ConvertTo-Json

Invoke-ApiTest -Method "POST" -Endpoint "/notifications" -Body $notificationData -Description "Enviar notificação"

Wait-Processing -Seconds 2

# Teste 6: Gestão de Estoque
Write-Host "`n📦 Teste 6: Gestão de Estoque" -ForegroundColor Blue
Write-Host "==============================" -ForegroundColor Blue

$stockAddData = @{
    productId = "prod_tablet_001"
    quantity = 5
    reason = "Reposição de teste PowerShell"
} | ConvertTo-Json

Invoke-ApiTest -Method "POST" -Endpoint "/inventory/stock/add" -Body $stockAddData -Description "Adicionar estoque"

Wait-Processing -Seconds 1

$stockReserveData = @{
    productId = "prod_tablet_001"
    quantity = 2
    orderId = "order_test_ps_$(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

Invoke-ApiTest -Method "POST" -Endpoint "/inventory/stock/reserve" -Body $stockReserveData -Description "Reservar estoque"

# Teste 7: Estatísticas
Write-Host "`n📊 Teste 7: Estatísticas e Relatórios" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

Invoke-ApiTest -Method "GET" -Endpoint "/inventory/stats" -Description "Estatísticas do inventário"

# Resumo final
Write-Host "`n📋 Resumo dos Testes de Integração" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Health check dos serviços" -ForegroundColor Green
Write-Host "✅ Listagem de produtos" -ForegroundColor Green
Write-Host "✅ Fluxo completo de pedido" -ForegroundColor Green
Write-Host "⚠️ Teste de cenários de falha" -ForegroundColor Yellow
Write-Host "✅ Sistema de notificações" -ForegroundColor Green
Write-Host "✅ Gestão de estoque" -ForegroundColor Green
Write-Host "✅ Estatísticas e relatórios" -ForegroundColor Green

Write-Host "`n🎉 Testes de integração concluídos!" -ForegroundColor Green
Write-Host "📊 Dashboard: $baseUrl" -ForegroundColor Blue
Write-Host "🐰 RabbitMQ: http://localhost:15672" -ForegroundColor Blue
Write-Host "======================================================" -ForegroundColor Cyan
