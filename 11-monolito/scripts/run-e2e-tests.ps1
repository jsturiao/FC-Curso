# Test Execution Script for FC Monolito API (PowerShell)
# This script runs all E2E tests with proper setup and reporting

Write-Host "🚀 Starting FC Monolito API E2E Tests" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Function to print colored output
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Warning "node_modules not found. Installing dependencies..."
    npm install
}

# Check if build exists
if (-not (Test-Path "dist")) {
    Write-Warning "dist folder not found. Building project..."
    npm run build
}

# Environment setup
$env:NODE_ENV = "test"
$env:LOG_LEVEL = "error"

Write-Success "Environment configured for testing"

# Run individual test suites
Write-Host ""
Write-Host "🧪 Running Individual Test Suites" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Products API Tests
Write-Host ""
Write-Success "Running Products API Tests..."
npx jest src/__tests__/api/products.e2e.spec.ts --verbose --detectOpenHandles

# Clients API Tests
Write-Host ""
Write-Success "Running Clients API Tests..."
npx jest src/__tests__/api/clients.e2e.spec.ts --verbose --detectOpenHandles

# Checkout API Tests
Write-Host ""
Write-Success "Running Checkout API Tests..."
npx jest src/__tests__/api/checkout.e2e.spec.ts --verbose --detectOpenHandles

# Invoice API Tests
Write-Host ""
Write-Success "Running Invoice API Tests..."
npx jest src/__tests__/api/invoice.e2e.spec.ts --verbose --detectOpenHandles

# Integration Tests
Write-Host ""
Write-Success "Running Integration Tests..."
npx jest src/__tests__/api/integration.e2e.spec.ts --verbose --detectOpenHandles

# Run all tests together
Write-Host ""
Write-Host "🔄 Running All API Tests Together" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
npx jest src/__tests__/api/ --verbose --detectOpenHandles --coverage

# Test Results Summary
Write-Host ""
Write-Host "📊 Test Execution Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Success "All E2E tests completed"
Write-Warning "Review test output above for any failures"
Write-Success "Coverage report generated in coverage/ directory"

Write-Host ""
Write-Host "🏁 Test execution finished!" -ForegroundColor Green
Write-Host "=========================="
