# Dockerfile para ambiente de desenvolvimento e testes - Clean Architecture
FROM node:18-alpine

# Instalar dependências do sistema necessárias para SQLite e build de módulos nativos
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    git

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package*.json ./
COPY tsconfig.json ./
COPY jest.config.ts ./
COPY tslint.json ./
COPY .swcrc ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY src/ ./src/

# Expor porta para desenvolvimento da API
EXPOSE 3000

# Comando padrão para desenvolvimento
CMD ["npm", "run", "test"]
