#!/bin/bash

# Script para execução de testes no Docker - Clean Architecture
# Uso: ./run-tests.sh [test-file-pattern]

PROJECT_NAME="clean-architecture"
CONTAINER_NAME="${PROJECT_NAME}-test"

echo "🚀 Iniciando ambiente Docker para testes Clean Architecture..."

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
  exit 1
fi

# Build da imagem
echo "🔨 Construindo imagem Docker..."
docker-compose build

# Executar testes
if [ -z "$1" ]; then
	echo "🧪 Executando todos os testes..."
	docker-compose run --rm clean-architecture npm test
else
	echo "🧪 Executando testes para: $1"
	docker-compose run --rm clean-architecture npm test -- $1
fi

echo "✅ Testes concluídos!"

# Cleanup
docker-compose down
