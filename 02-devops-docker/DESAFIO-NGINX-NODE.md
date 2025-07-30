# Desafio Nginx + Node.js + MySQL

## Objetivo
Configurar um ambiente com Nginx como proxy reverso, aplicação Node.js e banco MySQL, onde:
- Nginx recebe requests na porta 8080
- Nginx faz proxy para aplicação Node.js
- Node.js adiciona registros no MySQL e retorna HTML com lista de nomes
- Tudo deve funcionar com `docker-compose up -d`

## Análise do Projeto Atual

### Problemas Identificados:

1. **Falta o serviço Nginx no docker-compose.yaml**
2. **Aplicação Node.js não está completa:**
   - Não cria a tabela `people` no banco
   - Não lista nomes cadastrados
   - Não retorna o HTML correto
   - Conexão com MySQL inadequada
3. **Configuração do Nginx inadequada** (está configurada para Laravel/PHP)
4. **Porta errada** (aplicação exposta na 3000, deveria ser 8080 via Nginx)

## Correções Necessárias

### 1. Atualizar aplicação Node.js (node/index.js)

```javascript
const express = require('express')
const app = express()
const port = 3000

const config = {
    host: 'db',
    user: 'root',
    password: 'root',
    database: 'nodedb'
}

const mysql = require('mysql')

app.get('/', async (req, res) => {
    // Criar conexão para cada request
    const connection = mysql.createConnection(config)
    
    // Criar tabela se não existir
    const createTable = `CREATE TABLE IF NOT EXISTS people (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    )`
    
    // Inserir um nome aleatório
    const names = ['Wesley', 'João', 'Maria', 'José', 'Ana', 'Carlos', 'Lucia', 'Pedro']
    const randomName = names[Math.floor(Math.random() * names.length)]
    const insertSQL = `INSERT INTO people(name) VALUES('${randomName}')`
    
    // Buscar todos os nomes
    const selectSQL = `SELECT name FROM people`
    
    connection.query(createTable, (err) => {
        if (err) {
            console.log('Erro ao criar tabela:', err)
            return res.status(500).send('Erro interno')
        }
        
        connection.query(insertSQL, (err) => {
            if (err) {
                console.log('Erro ao inserir:', err)
                return res.status(500).send('Erro interno')
            }
            
            connection.query(selectSQL, (err, results) => {
                connection.end()
                
                if (err) {
                    console.log('Erro ao buscar:', err)
                    return res.status(500).send('Erro interno')
                }
                
                let namesList = '<ul>'
                results.forEach(row => {
                    namesList += `<li>${row.name}</li>`
                })
                namesList += '</ul>'
                
                const html = `
                    <h1>Full Cycle Rocks!</h1>
                    ${namesList}
                `
                
                res.send(html)
            })
        })
    })
})

app.listen(port, () => {
    console.log('Rodando na porta ' + port)
})
```

### 2. Configurar Nginx para Node.js (nginx/nginx.conf)

```nginx
server {
    listen 80;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Atualizar Dockerfile do Node.js

```dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Instalar dockerize
RUN apk add --no-cache wget

ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código da aplicação
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

### 4. Atualizar docker-compose.yaml

```yaml
version: '3'

services: 
  nginx:
    build: 
      context: nginx
    container_name: nginx
    ports: 
      - "8080:80"
    networks: 
      - node-network
    depends_on: 
      - app

  app:
    build: 
      context: node
    container_name: app
    entrypoint: dockerize -wait tcp://db:3306 -timeout 20s docker-entrypoint.sh
    networks: 
      - node-network
    volumes: 
      - ./node:/usr/src/app
      - /usr/src/app/node_modules
    tty: true
    depends_on: 
       - db

  db:
    image: mysql:5.7
    command: --innodb-use-native-aio=0
    container_name: db
    restart: always
    tty: true
    volumes: 
      - ./mysql:/var/lib/mysql
    environment: 
      - MYSQL_DATABASE=nodedb
      - MYSQL_ROOT_PASSWORD=root
    networks: 
      - node-network

networks: 
  node-network:
    driver: bridge
```

### 5. Atualizar Dockerfile do Nginx

```dockerfile
FROM nginx:latest

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

## Passos para Implementar

1. **Atualizar node/index.js** com a nova lógica
2. **Atualizar nginx/nginx.conf** para proxy reverso
3. **Atualizar node/Dockerfile** para copiar arquivos e instalar dependências
4. **Atualizar nginx/Dockerfile** para usar a configuração correta
5. **Atualizar docker-compose.yaml** para incluir Nginx e configurar porta 8080
6. **Remover a pasta mysql** se existir (para limpar dados antigos)

## Comandos para Executar

### No WSL (Linux):
```bash
# Navegar para o diretório do projeto
cd /mnt/c/Users/joniel.silva/Downloads/Joniel/Full\ Cycle/fc-curso/02-devops-docker

# Limpar containers e volumes antigos
docker-compose down -v

# Remover imagens antigas (opcional)
docker-compose down --rmi all

# Subir o ambiente
docker-compose up -d --build

# Verificar se está funcionando
# Acesse http://localhost:8080
```

### No Windows PowerShell:
```powershell
# Navegar para o diretório do projeto
cd "c:\Users\joniel.silva\Downloads\Joniel\Full Cycle\fc-curso\02-devops-docker"

# Limpar containers e volumes antigos
docker-compose down -v

# Subir o ambiente
docker-compose up -d --build
```

## Resultado Esperado

Ao acessar `http://localhost:8080`, você deve ver:
- O título "Full Cycle Rocks!"
- Uma lista com nomes cadastrados no banco de dados
- A cada refresh, um novo nome é adicionado à lista

## Estrutura Final de Arquivos

```
projeto/
├── docker-compose.yaml
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── node/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
└── mysql/ (criado automaticamente)
```

## Observações Importantes

1. **Volume de desenvolvimento**: O volume `./node:/usr/src/app` permite editar o código sem rebuild
2. **Volume de node_modules**: O volume `/usr/src/app/node_modules` evita conflitos entre host e container
3. **Dockerize**: Garante que a aplicação só inicie após o MySQL estar disponível
4. **Rede interna**: Todos os serviços comunicam através da rede `node-network`
5. **Porta 8080**: Apenas o Nginx expõe porta externamente (8080)

---

## 📚 Documentação Adicional

Para entender em detalhes como a aplicação funciona internamente, consulte:

🔧 **[FUNCIONAMENTO-DETALHADO.md](./FUNCIONAMENTO-DETALHADO.md)** - Explicação completa com fluxos de:
- Construção das imagens
- Comunicação entre containers  
- Fluxo de requisições HTTP
- Arquitetura de rede
- Debugging e monitoramento
