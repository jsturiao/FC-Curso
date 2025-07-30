# Full Cycle - Repositório de Projetos

Este é um repositório centralizado para os projetos realizados na formação **Full Cycle**, cobrindo conceitos fundamentais e avançados de desenvolvimento de software, arquitetura, DevOps e tecnologias modernas.

## 📁 Estrutura dos Projetos

### 🐳 02-docker
**Descrição**: Projeto de containerização com Docker  
**Tecnologias**: Go, Docker  
**Objetivo**: Demonstrar criação de imagem Docker otimizada (< 2MB) usando multi-stage builds  

**Características**:
- Aplicação Go que imprime "Full Cycle Rocks!!"
- Multi-stage build para otimização de tamanho
- Imagem final usando `scratch` (1.43MB)
- Flags de compilação otimizadas (`-ldflags "-s -w"`)
- Disponível no Docker Hub: `jsturiao/fc_02_docker`

```bash
# Executar do Docker Hub
docker run jsturiao/fc_02_docker

# Build local
docker build -t jsturiao/fc_02_docker .
docker run jsturiao/fc_02_docker
```

---

### 🐳 02-devops-docker
**Descrição**: Arquitetura completa com Nginx + Node.js + MySQL usando Docker Compose  
**Tecnologias**: Docker Compose, Nginx, Node.js, MySQL, Express  
**Objetivo**: Demonstrar orquestração de containers e comunicação entre serviços  

**Arquitetura**:
- **Nginx**: Proxy reverso na porta 8080
- **Node.js**: API backend na porta 3000 (interna)
- **MySQL**: Banco de dados na porta 3306 (interna)

**Características**:
- Rede isolada (`node-network`) para comunicação inter-container
- Volume persistente para dados MySQL
- Dependências controladas entre serviços
- Dockerize para sincronização de inicialização
- A cada refresh, adiciona um nome aleatório ao banco

```bash
# Executar ambiente completo
docker-compose up -d --build

# Acessar aplicação
http://localhost:8080

# Limpar ambiente
docker-compose down -v
```

**Documentação Adicional**:
- 📋 `DESAFIO-NGINX-NODE.md` - Especificações do desafio
- 🔧 `FUNCIONAMENTO-DETALHADO.md` - Arquitetura e fluxos internos

---

### 🏗️ 07-ddd-patterns
**Descrição**: Implementação de Domain-Driven Design (DDD) patterns  
**Tecnologias**: TypeScript, Jest, Sequelize, SQLite  
**Objetivo**: Demonstrar padrões de DDD, SOLID e Clean Architecture  

**Padrões Implementados**:
- **Repository Pattern**: Abstração da camada de persistência
- **Factory Pattern**: Criação centralizada de objetos
- **Value Objects**: Objetos de valor imutáveis (Address, etc.)
- **Entities**: Entidades de domínio (Customer, Product, Order)
- **Domain Services**: Lógicas de negócio complexas
- **Domain Events**: Eventos de domínio

**Estrutura**:
```
src/
├── domain/           # Regras de negócio puras
│   ├── customer/     # Agregado Cliente
│   ├── product/      # Agregado Produto  
│   └── checkout/     # Agregado Pedido
└── infrastructure/   # Implementações técnicas
    ├── customer/
    ├── product/
    └── order/
```

**Conceitos Demonstrados**:
- Agregados DDD bem definidos
- Separação clara entre domínio e infraestrutura
- Testes unitários abrangentes
- Padrão Repository com Sequelize

```bash
# Executar testes
npm test

# Compilar TypeScript
npm run tsc
```

---

### �️ 10-clean-architecture
**Descrição**: Implementação de Clean Architecture com APIs REST  
**Tecnologias**: TypeScript, Node.js, Express, Sequelize, Jest, Yup  
**Objetivo**: Demonstrar separação de camadas e inversão de dependências com APIs HTTP  

**Estrutura de Clean Architecture**:
```
src/
├── domain/           # Entidades e regras de negócio puras
│   ├── customer/     # Domínio do cliente
│   ├── product/      # Domínio do produto
│   └── checkout/     # Domínio de checkout
├── usecase/          # Casos de uso (camada de aplicação)
│   └── customer/     # CRUD de clientes
├── infrastructure/   # Implementações técnicas
│   ├── api/          # API REST com Express
│   ├── customer/     # Repository com Sequelize
│   ├── product/      # Repository de produtos
│   └── order/        # Repository de pedidos
```

**Casos de Uso Implementados**:
- **CreateCustomerUseCase**: Criar novo cliente
- **FindCustomerUseCase**: Buscar cliente por ID
- **ListCustomerUseCase**: Listar todos os clientes
- **UpdateCustomerUseCase**: Atualizar dados do cliente

**APIs REST**:
- `POST /customer` - Criar cliente
- `GET /customer` - Listar clientes
- `GET /customer/:id` - Buscar cliente
- `PUT /customer/:id` - Atualizar cliente

**Padrões Demonstrados**:
- **Clean Architecture**: Separação de responsabilidades em camadas
- **Dependency Inversion**: Use cases dependem de abstrações
- **Repository Pattern**: Abstração da persistência
- **Factory Pattern**: Criação de entidades
- **Presenter Pattern**: Formatação de dados para API
- **DTO Pattern**: Transfer objects entre camadas

```bash
# Executar servidor
npm run dev

# Executar testes
npm test

# Compilar TypeScript
npm run tsc
```

---

### �🏢 11-monolito
**Descrição**: Sistema monolítico modular implementando arquitetura hexagonal  
**Tecnologias**: TypeScript, Node.js, Express, Sequelize, Jest, Docker  
**Objetivo**: Demonstrar arquitetura modular, DDD e comunicação entre bounded contexts  

**Arquitetura Modular**:
Cada módulo representa um **Bounded Context** independente:

- **@shared**: Infraestrutura compartilhada (BaseEntity, Value Objects)
- **client-adm**: Administração de clientes (backoffice)
- **product-adm**: Administração de produtos (estoque, preços)
- **store-catalog**: Catálogo público de produtos
- **checkout**: Processo de compra e pedidos
- **payment**: Processamento de pagamentos
- **invoice**: Geração de faturas

**Padrões Arquiteturais**:
- **Clean Architecture**: Separação em camadas bem definidas
- **Facade Pattern**: Interfaces simplificadas entre módulos
- **Use Case Pattern**: Encapsulamento de regras de negócio
- **Gateway Pattern**: Abstração de serviços externos
- **Factory Pattern**: Injeção de dependência

**Estrutura por Módulo**:
```
módulo/
├── domain/      # Entidades e regras de negócio
├── usecase/     # Casos de uso (aplicação)
├── gateway/     # Contratos de persistência
├── repository/  # Implementação de persistência
├── facade/      # Interface externa do módulo
└── factory/     # Dependency Injection
```

**APIs REST**:
- `/clients` - Gestão de clientes
- `/products` - Catálogo de produtos
- `/checkout` - Processamento de pedidos
- `/invoices` - Consulta de faturas

```bash
# Executar com Docker
docker-compose up

# Executar testes localmente
npm test

# Executar testes E2E
./scripts/run-e2e-tests.sh
```

**Documentação Adicional**:
- 📋 `ARQUITETURA_E_FLUXO.md` - Arquitetura detalhada e fluxos de funcionamento

---

### ☸️ 26-kubernetes
**Descrição**: Configuração de cluster Kubernetes com Kind  
**Tecnologias**: Kubernetes, Kind (Kubernetes in Docker)  
**Objetivo**: Demonstrar orquestração com Kubernetes  

**Configuração**:
- 1 Control Plane node
- 3 Worker nodes
- Cluster local usando Kind

```bash
# Criar cluster
kind create cluster --config=kind.yaml

# Verificar nodes
kubectl get nodes

# Deletar cluster
kind delete cluster
```

---

## 🛠️ Tecnologias Utilizadas

### **Linguagens**
- **Go** - Aplicações performáticas e containers otimizados
- **TypeScript/JavaScript** - Desenvolvimento web e APIs
- **Node.js** - Runtime server-side

### **Bancos de Dados**
- **MySQL** - Banco relacional para aplicações web
- **SQLite** - Banco em memória para testes

### **Containerização & Orquestração**
- **Docker** - Containerização de aplicações
- **Docker Compose** - Orquestração multi-container
- **Kubernetes** - Orquestração de containers em produção
- **Kind** - Kubernetes local para desenvolvimento

### **Arquitetura & Padrões**
- **Domain-Driven Design (DDD)** - Modelagem orientada ao domínio
- **Clean Architecture** - Separação de responsabilidades
- **SOLID Principles** - Princípios de design de software
- **Repository Pattern** - Abstração de persistência
- **Factory Pattern** - Criação de objetos
- **Facade Pattern** - Interfaces simplificadas

### **Ferramentas de Desenvolvimento**
- **Jest** - Framework de testes
- **Sequelize** - ORM para Node.js
- **Express** - Framework web para Node.js
- **SWC** - Compilador rápido para TypeScript
- **TSLint** - Linter para TypeScript

---

## 🚀 Como Executar os Projetos

Cada projeto possui instruções específicas em seu respectivo README. De forma geral:

### **Projetos Docker**
```bash
cd 02-docker
docker build -t projeto .
docker run projeto
```

### **Projetos Docker Compose**
```bash
cd 02-devops-docker
docker-compose up -d --build
```

### **Projetos TypeScript**
```bash
cd 07-ddd-patterns  # ou 11-monolito
npm install
npm test
```

### **Projetos Kubernetes**
```bash
cd 26-kubernetes
kind create cluster --config=kind.yaml
```

---

## 📚 Conceitos Demonstrados

### **DevOps & Infraestrutura**
- Containerização com Docker
- Orquestração com Docker Compose
- Kubernetes para produção
- Configuração de proxy reverso
- Gerenciamento de volumes e redes

### **Arquitetura de Software**
- Domain-Driven Design (DDD)
- Clean Architecture
- Arquitetura Hexagonal
- Monólito Modular
- Bounded Contexts

### **Padrões de Desenvolvimento**
- Repository Pattern
- Factory Pattern
- Facade Pattern
- Use Case Pattern
- Value Objects
- Aggregate Roots

### **Qualidade de Software**
- Testes Unitários
- Testes de Integração
- Testes End-to-End
- Cobertura de Testes
- Linting e Formatação

---

## 🎯 Objetivos de Aprendizado

Este repositório demonstra a progressão de conhecimento em:

1. **Fundamentos**: Containerização e orquestração básica
2. **Arquitetura**: Padrões de design e clean code
3. **Domínio**: Modelagem de negócio com DDD
4. **Sistemas**: Arquiteturas modulares e distribuídas
5. **Produção**: Kubernetes e deployment

---

## 📖 Documentação Adicional

Cada projeto contém documentação específica:
- **README.md** - Instruções básicas de execução
- **Arquivos .md específicos** - Documentação detalhada de funcionamento
- **Comentários no código** - Explicações inline dos conceitos

---

**Formação Full Cycle** - Desenvolvendo profissionais completos para o mercado de tecnologia.
