# 🚀 Funcionamento Detalhado da Aplicação Nginx + Node.js + MySQL

## 📋 Visão Geral

Esta aplicação demonstra uma arquitetura completa de microsserviços usando Docker Compose, onde:
- **Nginx** atua como proxy reverso
- **Node.js** processa as requisições e gerencia dados
- **MySQL** persiste os dados
- **Docker Compose** orquestra toda a comunicação

---

## 🏗️ Fluxo de Construção das Imagens

```
🔨 FASE 1: BUILD DAS IMAGENS
│
├── 📦 Nginx Image
│   │
│   ├── FROM nginx:latest
│   ├── COPY nginx.conf → /etc/nginx/conf.d/default.conf
│   └── EXPOSE 80
│
├── 📦 Node.js Image  
│   │
│   ├── FROM node:18-alpine
│   ├── WORKDIR /usr/src/app
│   ├── RUN apk add --no-cache wget
│   ├── RUN wget dockerize → /usr/local/bin/
│   ├── COPY docker-entrypoint.sh → /usr/local/bin/
│   ├── COPY package*.json ./
│   ├── RUN npm install
│   ├── COPY . .
│   └── EXPOSE 3000
│
└── 📦 MySQL Image (oficial)
    │
    └── FROM mysql:5.7 (pulled from Docker Hub)
```

---

## 🌐 Arquitetura de Rede

```
🔗 REDE: node-network (bridge)
│
├── 🌍 Host Machine
│   └── Porta 8080 → [NGINX:80]
│
├── 🔄 nginx (container)
│   ├── IP: 172.20.0.3
│   ├── Porta interna: 80
│   └── Proxy → app:3000
│
├── 🟢 app (container)  
│   ├── IP: 172.20.0.4
│   ├── Porta interna: 3000
│   └── Conecta → db:3306
│
└── 🗄️ db (container)
    ├── IP: 172.20.0.2
    ├── Porta interna: 3306
    └── Volume: mysql_data
```

---

## 🔄 Fluxo de Inicialização (docker-compose up -d)

```
🚀 FASE 2: INICIALIZAÇÃO DOS CONTAINERS
│
1️⃣ 🗄️ DB Container Start
   │
   ├── Cria volume: mysql_data
   ├── Inicializa MySQL Server
   ├── Cria database: nodedb
   ├── Define root password: root
   └── ✅ Pronto na porta 3306
   │
   ⏱️ (Aguarda ~10-15 segundos)
   │
2️⃣ 🟢 APP Container Start
   │
   ├── Executa: dockerize -wait tcp://db:3306 -timeout 20s
   │   └── ⏳ Aguarda MySQL estar disponível
   │
   ├── Executa: docker-entrypoint.sh
   │   ├── cd /usr/src/app
   │   ├── npm install (instala dependências)
   │   └── exec node index.js
   │
   ├── Node.js inicia na porta 3000
   ├── Conecta com MySQL (db:3306)
   └── ✅ API pronta para receber requests
   │
3️⃣ 🔄 NGINX Container Start
   │
   ├── Carrega configuração nginx.conf
   ├── Configura proxy_pass → app:3000
   ├── Bind porta 8080:80
   └── ✅ Proxy reverso ativo
```

---

## 📡 Fluxo de Requisição HTTP

```
🌐 FLUXO COMPLETO DE REQUEST
│
1️⃣ 👤 Cliente
   │
   └── HTTP GET http://localhost:8080
       │
2️⃣ 🔄 Nginx (Proxy Reverso)
   │
   ├── Recebe request na porta 80 (mapeada de 8088)
   ├── Aplica configuração proxy_pass
   ├── Define headers:
   │   ├── Host: $host
   │   ├── X-Real-IP: $remote_addr
   │   ├── X-Forwarded-For: $proxy_add_x_forwarded_for
   │   └── X-Forwarded-Proto: $scheme
   │
   └── Encaminha → http://app:3000/
       │
3️⃣ 🟢 Node.js Application
   │
   ├── Express.js recebe GET /
   ├── Cria conexão MySQL: mysql.createConnection(config)
   │   └── host: 'db', user: 'root', password: 'root', database: 'nodedb'
   │
   ├── Executa SQL: CREATE TABLE IF NOT EXISTS people
   │   └── Tabela: id (AUTO_INCREMENT), name (VARCHAR)
   │
   ├── Gera nome aleatório: ['Wesley', 'João', 'Maria', ...]
   ├── Executa SQL: INSERT INTO people(name) VALUES(?)
   │
   ├── Executa SQL: SELECT name FROM people
   ├── Constrói HTML:
   │   ├── <h1>Full Cycle Rocks!</h1>
   │   └── <ul><li>nome1</li><li>nome2</li>...</ul>
   │
   └── connection.end()
       │
4️⃣ 🗄️ MySQL Database
   │
   ├── Recebe conexão na porta 3306
   ├── Autentica: root/root
   ├── Usa database: nodedb
   ├── Executa queries:
   │   ├── CREATE TABLE (se não existir)
   │   ├── INSERT novo nome
   │   └── SELECT todos os nomes
   │
   └── Retorna resultados → Node.js
       │
5️⃣ 🔄 Response Flow (Volta)
   │
   Node.js → HTML Response → Nginx → Cliente
   │
   └── Status 200 + HTML Content
```

---

## 📁 Estrutura de Volumes e Persistência

```
💾 VOLUMES E PERSISTÊNCIA
│
├── 🔗 Bind Mounts (Development)
│   │
│   ├── ./node:/usr/src/app
│   │   ├── Mapeia código local → container
│   │   ├── Permite edição em tempo real
│   │   └── Hot reload para desenvolvimento
│   │
│   └── /usr/src/app/node_modules
│       ├── Volume anônimo
│       ├── Evita conflito entre host/container
│       └── Preserva dependências do container
│
└── 📦 Named Volume (Production Data)
    │
    └── mysql_data:/var/lib/mysql
        ├── Persiste dados do MySQL
        ├── Sobrevive a recreação de containers
        └── Gerenciado pelo Docker
```

---

## 🔄 Comunicação Inter-Container

```
🗪 COMUNICAÇÃO ENTRE SERVICES
│
├── 🌐 DNS Resolution (Docker Network)
│   │
│   ├── nginx → app (por nome do service)
│   ├── app → db (por nome do service)  
│   └── Resolução automática de IPs
│
├── 🔗 Network Policies
│   │
│   ├── Rede: node-network (bridge)
│   ├── Isolamento: apenas containers na mesma rede
│   └── Exposição: apenas nginx tem porta externa
│
└── 🎯 Service Dependencies
    │
    ├── nginx depends_on: [app]
    ├── app depends_on: [db]
    └── Ordem de inicialização garantida
```

---

## ⚙️ Configurações Específicas

### 🔄 Nginx Configuration
```nginx
server {
    listen 80;                    # Porta interna do container
    
    location / {
        proxy_pass http://app:3000;              # DNS interno
        proxy_set_header Host $host;             # Preserva host original
        proxy_set_header X-Real-IP $remote_addr; # IP real do cliente
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 🟢 Node.js Database Connection
```javascript
const config = {
    host: 'db',        // Nome do service no Docker Compose
    user: 'root',      // Usuário definido no MySQL container
    password: 'root',  # Senha definida via env MYSQL_ROOT_PASSWORD
    database: 'nodedb' # Database criado automaticamente
}
```

### 🗄️ MySQL Environment
```yaml
environment:
    - MYSQL_DATABASE=nodedb      # Cria DB automaticamente
    - MYSQL_ROOT_PASSWORD=root   # Define senha do root
command: --innodb-use-native-aio=0  # Compatibilidade com containers
```

---

## 🐛 Debugging e Monitoramento

### 📊 Comandos Úteis
```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f db

# Executar comandos dentro dos containers
docker exec -it app sh
docker exec -it db mysql -uroot -proot nodedb

# Verificar rede
docker network inspect 02-devops-docker_node-network

# Verificar volumes
docker volume inspect 02-devops-docker_mysql_data
```

### 🔍 Health Checks
```bash
# Testar aplicação diretamente
curl http://localhost:8080

# Testar Node.js bypassing nginx
curl http://localhost:3000  # (se exposta)

# Verificar conectividade MySQL
docker exec app ping db
```

---

## 🚀 Fluxo de Deploy/Atualização

```
🔄 DEPLOY WORKFLOW
│
1️⃣ Desenvolvimento Local
   │
   ├── Editar código em ./node/
   ├── Mudanças refletidas automaticamente (volume bind)
   └── Testar: http://localhost:8080
   │
2️⃣ Build & Deploy
   │
   ├── docker-compose down
   ├── docker-compose build --no-cache
   ├── docker-compose up -d
   └── Verificar logs: docker-compose logs -f
   │
3️⃣ Produção (Adaptações necessárias)
   │
   ├── Remover bind mounts
   ├── Usar apenas named volumes
   ├── Configurar secrets para passwords
   └── Usar networks externas
```

---

## 🎯 Pontos Chave da Arquitetura

### ✅ **Vantagens desta Implementação:**

1. **🔄 Proxy Reverso**: Nginx distribui carga e protege aplicação
2. **🌐 Service Discovery**: Containers se comunicam por nome
3. **💾 Persistência**: Dados MySQL preservados entre restarts
4. **🔧 Development Mode**: Hot reload com bind mounts
5. **📦 Isolamento**: Cada serviço em container isolado
6. **🔗 Orquestração**: Docker Compose gerencia todo ciclo de vida

### ⚠️ **Considerações de Produção:**

1. **Secrets**: Não usar senhas hardcoded
2. **SSL/TLS**: Configurar certificados no Nginx
3. **Health Checks**: Implementar endpoints de saúde
4. **Backup**: Estratégia para volume MySQL
5. **Monitoring**: Logs centralizados e métricas
6. **Scaling**: Preparar para múltiplas instâncias

---

## 📈 Métricas e Performance

```
📊 MÉTRICAS IMPORTANTES
│
├── 🕐 Tempo de Inicialização
│   ├── MySQL: ~10-15 segundos
│   ├── Node.js: ~2-3 segundos (após MySQL)
│   └── Nginx: ~1 segundo
│
├── 💾 Uso de Recursos
│   ├── MySQL: ~400MB RAM
│   ├── Node.js: ~50MB RAM  
│   └── Nginx: ~10MB RAM
│
└── 🔄 Throughput
    ├── Nginx: ~1000 req/s (típico)
    ├── Node.js: ~500 req/s (single thread)
    └── MySQL: Depende da query complexity
```

Este documento fornece uma visão completa de como a aplicação funciona, desde a construção das imagens até a comunicação entre os containers, facilitando o entendimento, debugging e futuras melhorias! 🚀
