# Estágio 1: Build
FROM ubuntu:20.04 AS builder

# Configurar para não fazer perguntas interativas
ENV DEBIAN_FRONTEND=noninteractive

# Instalar Go
RUN apt-get update && apt-get install -y golang-go && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar o código fonte
COPY main.go .

# Build da aplicação com flags para otimizar o tamanho
# -ldflags "-s -w" remove informações de debug e símbolos
# CGO_ENABLED=0 garante que não há dependências C
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o fullcycle main.go

# Estágio 2: Imagem final minimalista
FROM scratch

# Copiar apenas o binário compilado
COPY --from=builder /app/fullcycle /fullcycle

# Comando para executar a aplicação
CMD ["/fullcycle"]
