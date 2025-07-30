#!/bin/bash

# Test Execution Script for FC Monolito API
# This script runs all E2E tests with proper setup and reporting

echo "🚀 Starting FC Monolito API E2E Tests"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check if build exists
if [ ! -d "dist" ]; then
    print_warning "dist folder not found. Building project..."
    npm run build
fi

# Environment setup
export NODE_ENV=test
export LOG_LEVEL=error

print_status "Environment configured for testing"

# Run individual test suites
echo ""
echo "🧪 Running Individual Test Suites"
echo "=================================="

# Products API Tests
echo ""
print_status "Running Products API Tests..."
npx jest src/__tests__/api/products.e2e.spec.ts --verbose --detectOpenHandles

# Clients API Tests
echo ""
print_status "Running Clients API Tests..."
npx jest src/__tests__/api/clients.e2e.spec.ts --verbose --detectOpenHandles

# Checkout API Tests
echo ""
print_status "Running Checkout API Tests..."
npx jest src/__tests__/api/checkout.e2e.spec.ts --verbose --detectOpenHandles

# Invoice API Tests
echo ""
print_status "Running Invoice API Tests..."
npx jest src/__tests__/api/invoice.e2e.spec.ts --verbose --detectOpenHandles

# Integration Tests
echo ""
print_status "Running Integration Tests..."
npx jest src/__tests__/api/integration.e2e.spec.ts --verbose --detectOpenHandles

# Run all tests together
echo ""
echo "🔄 Running All API Tests Together"
echo "================================="
npx jest src/__tests__/api/ --verbose --detectOpenHandles --coverage

# Test Results Summary
echo ""
echo "📊 Test Execution Summary"
echo "========================"
print_status "All E2E tests completed"
print_warning "Review test output above for any failures"
print_status "Coverage report generated in coverage/ directory"

echo ""
echo "🏁 Test execution finished!"
echo "=========================="
