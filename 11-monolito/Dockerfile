# Use a imagem oficial do Node.js
FROM node:18-alpine

# Defina o diretório de trabalho
WORKDIR /app

# Copie os arquivos de dependências
COPY package*.json ./

# Instale as dependências (usar install para atualizar lock file)
RUN npm install

# Copie o código fonte
COPY . .

# Comando para executar os testes (Jest já compila com SWC)
CMD ["npm", "test"]
