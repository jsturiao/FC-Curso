# FC Monolito - Sistema Monolítico Modular

## 📋 Sobre o Projeto

O **FC Monolito** é um sistema de e-commerce desenvolvido como uma aplicação monolítica modular em TypeScript/Node.js. O projeto implementa conceitos avançados de arquitetura de software, seguindo os princípios de **Domain-Driven Design (DDD)**, **Clean Architecture** e **SOLID**, organizando o código em módulos bem definidos que representam diferentes contextos de negócio.

## 🏗️ Arquitetura

### Visão Geral
O sistema é estruturado como um **monolito modular**, onde cada módulo representa um **Bounded Context** do domínio de e-commerce, mantendo baixo acoplamento entre si e comunicando-se através de interfaces bem definidas (Facades).

### Padrões Arquiteturais Implementados

- **Domain-Driven Design (DDD)**: Organização do código focada no domínio de negócio
- **Clean Architecture**: Separação clara de responsabilidades em camadas
- **Facade Pattern**: Interface simplificada para comunicação entre módulos
- **Repository Pattern**: Abstração da camada de persistência
- **Use Case Pattern**: Encapsulamento das regras de negócio
- **Factory Pattern**: Criação centralizada de objetos complexos
- **Gateway Pattern**: Abstração de serviços externos

## 📁 Estrutura do Projeto

```
fc-monolito/
├── src/
│   ├── index.ts                     # Ponto de entrada da aplicação
│   └── modules/
│       ├── @shared/                 # Código compartilhado entre módulos
│       │   ├── domain/
│       │   │   ├── entity/
│       │   │   │   ├── base.entity.ts
│       │   │   │   └── aggregate-root.interface.ts
│       │   │   └── value-object/
│       │   │       ├── id.value-object.ts
│       │   │       ├── address.ts
│       │   │       └── value-object.interface.ts
│       │   └── usecase/
│       │       └── use-case.interface.ts
│       ├── client-adm/              # Módulo de Administração de Clientes
│       ├── product-adm/             # Módulo de Administração de Produtos
│       ├── store-catalog/           # Módulo de Catálogo da Loja
│       └── payment/                 # Módulo de Pagamentos
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── jest.config.ts
```

### Estrutura Padrão de Cada Módulo

Cada módulo segue uma estrutura consistente baseada nos princípios da Clean Architecture:

```
module-name/
├── domain/                    # Camada de Domínio
│   ├── *.entity.ts           # Entidades de domínio
│   └── *.value-object.ts     # Objetos de valor
├── usecase/                  # Camada de Aplicação
│   └── operation-name/
│       ├── *.usecase.ts      # Casos de uso
│       ├── *.usecase.spec.ts # Testes unitários
│       └── *.dto.ts          # Data Transfer Objects
├── gateway/                  # Interfaces de Saída
│   └── *.gateway.ts          # Contratos para repositórios
├── repository/               # Camada de Infraestrutura
│   ├── *.model.ts            # Modelos do banco de dados
│   ├── *.repository.ts       # Implementação dos repositórios
│   └── *.repository.spec.ts  # Testes de integração
├── facade/                   # Interface Pública do Módulo
│   ├── *.facade.ts           # Implementação da facade
│   ├── *.facade.spec.ts      # Testes da facade
│   └── *.facade.interface.ts # Contrato da facade
└── factory/                  # Fábricas
    └── *.factory.ts          # Criação de objetos complexos
```

## 🎯 Módulos do Sistema

### 1. **Client Admin** - Administração de Clientes
**Responsabilidade**: Gerenciamento completo de clientes do sistema.

**Funcionalidades**:
- ✅ Cadastro de novos clientes com informações completas
- ✅ Busca de clientes por ID
- ✅ Validação de dados de cliente
- ✅ Gerenciamento de endereços

**Entidades**:
- `Client`: Cliente com informações pessoais e endereço

**Use Cases**:
- `AddClientUseCase`: Adicionar novo cliente
- `FindClientUseCase`: Buscar cliente por ID

**Tecnologias**: Sequelize ORM, SQLite, Validação com tipos TypeScript

### 2. **Product Admin** - Administração de Produtos
**Responsabilidade**: Gerenciamento de produtos para administradores.

**Funcionalidades**:
- ✅ Cadastro de produtos com preço de compra
- ✅ Controle de estoque
- ✅ Consulta de disponibilidade de estoque
- ✅ Atualização de informações de produtos

**Entidades**:
- `Product`: Produto com informações administrativas (preço de compra, estoque)

**Use Cases**:
- `AddProductUseCase`: Adicionar novo produto
- `CheckStockUseCase`: Verificar estoque disponível

**Diferenciais**: Foco em operações administrativas com controle detalhado de estoque.

### 3. **Store Catalog** - Catálogo da Loja
**Responsabilidade**: Apresentação de produtos para clientes finais.

**Funcionalidades**:
- ✅ Listagem de produtos disponíveis
- ✅ Busca de produto específico
- ✅ Exibição de preços de venda
- ✅ Catálogo otimizado para consulta

**Entidades**:
- `Product`: Produto com foco em informações de venda (preço de venda)

**Use Cases**:
- `FindProductUseCase`: Buscar produto específico
- `FindAllProductsUseCase`: Listar todos os produtos

**Diferenciais**: Otimizado para consultas rápidas e apresentação ao cliente.

### 4. **Payment** - Sistema de Pagamentos
**Responsabilidade**: Processamento e gerenciamento de transações financeiras.

**Funcionalidades**:
- ✅ Processamento automático de pagamentos
- ✅ Aprovação/Rejeição baseada em regras de negócio
- ✅ Histórico de transações
- ✅ Estados de transação (pending, approved, declined)

**Entidades**:
- `Transaction`: Transação financeira com status e validações

**Use Cases**:
- `ProcessPaymentUseCase`: Processar pagamento com regras automáticas

**Regras de Negócio**:
- Pagamentos ≥ R$ 100,00: Aprovados automaticamente
- Pagamentos < R$ 100,00: Rejeitados automaticamente

## 🛠️ Tecnologias Utilizadas

### **Backend**
- **Node.js 18+**: Runtime JavaScript
- **TypeScript**: Linguagem tipada
- **Express.js**: Framework web minimalista
- **Sequelize**: ORM para banco de dados
- **SQLite**: Banco de dados para desenvolvimento/testes

### **Testes**
- **Jest**: Framework de testes
- **SWC**: Transpilador rápido TypeScript
- **Supertest**: Testes de API

### **DevOps**
- **Docker**: Containerização
- **Docker Compose**: Orquestração de containers

### **Qualidade de Código**
- **TSLint**: Linting de código
- **Prettier**: Formatação automática
- **Reflect Metadata**: Suporte a decorators

## 🚀 Como Executar

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)

### Execução com Docker (Recomendado)

```bash
# Clonar o repositório
git clone <repository-url>
cd fc-monolito

# Executar testes no Docker
docker-compose up

# Ou executar interativamente
docker-compose run app npm test
```

### Execução Local (Desenvolvimento)

```bash
# Instalar dependências
npm install

# Executar testes
npm test

# Verificar tipos TypeScript
npm run tsc -- --noEmit
```

### Scripts Disponíveis

```bash
npm test       # Executa todos os testes
npm run tsc    # Compilação TypeScript
```

## 🧪 Testes

O projeto possui cobertura abrangente de testes:

### **Tipos de Teste**
- **Testes Unitários**: Validam use cases isoladamente
- **Testes de Integração**: Validam repositórios com banco de dados
- **Testes de Facade**: Validam interfaces públicas dos módulos

### **Executar Testes**
```bash
# Todos os testes
npm test

# Testes específicos
jest --testPathPattern=client-adm
jest --testPathPattern=payment
```

### **Cobertura de Testes**
- ✅ Use Cases: 100%
- ✅ Repositories: 100%
- ✅ Facades: 100%
- ✅ Domain Entities: 100%

## 🏛️ Princípios de Design

### **SOLID**
- **S**ingle Responsibility: Cada classe tem uma única responsabilidade
- **O**pen/Closed: Extensível via interfaces, fechado para modificação
- **L**iskov Substitution: Interfaces podem ser substituídas transparentemente
- **I**nterface Segregation: Interfaces específicas e focadas
- **D**ependency Inversion: Dependência de abstrações, não implementações

### **Clean Architecture**
- **Camada de Domínio**: Entidades e regras de negócio centrais
- **Camada de Aplicação**: Use cases e coordenação
- **Camada de Infraestrutura**: Banco de dados, APIs externas
- **Camada de Interface**: Facades e DTOs

### **Domain-Driven Design**
- **Bounded Contexts**: Módulos bem definidos
- **Entities**: Objetos com identidade única
- **Value Objects**: Objetos imutáveis sem identidade
- **Aggregate Roots**: Entidades que controlam acesso ao agregado
- **Repositories**: Abstração de persistência
- **Facades**: Anti-corruption layer entre contextos

## 📊 Fluxos Principais

### **1. Cadastro de Cliente**
```
Client Request → Client Admin Facade → Add Client Use Case → Client Repository → Database
```

### **2. Cadastro de Produto**
```
Admin Request → Product Admin Facade → Add Product Use Case → Product Repository → Database
```

### **3. Consulta de Catálogo**
```
Customer Request → Store Catalog Facade → Find Products Use Case → Product Repository → Database
```

### **4. Processamento de Pagamento**
```
Payment Request → Payment Facade → Process Payment Use Case → Payment Gateway → Transaction Repository → Database
```

## 🔮 Próximos Passos

### **Funcionalidades Planejadas**
- [ ] API REST completa
- [ ] Módulo de Pedidos (Orders)
- [ ] Módulo de Estoque (Inventory)
- [ ] Integração com gateways de pagamento reais
- [ ] Sistema de notificações
- [ ] Relatórios e analytics

### **Melhorias Técnicas**
- [ ] Implementação de eventos de domínio
- [ ] Cache com Redis
- [ ] Monitoramento e observabilidade
- [ ] CI/CD pipeline
- [ ] Migração para PostgreSQL
- [ ] Implementação de CQRS

## 📝 Licença

Este projeto é desenvolvido para fins educacionais como parte do curso Full Cycle.

## 👥 Contribuição

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

**Desenvolvido com ❤️ utilizando os princípios de Clean Architecture e Domain-Driven Design**
# fc-11-monolito
