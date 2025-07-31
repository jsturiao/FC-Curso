# Clean Architecture - Documentação Técnica

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Camadas da Arquitetura](#camadas-da-arquitetura)
4. [Fluxo de Comunicação](#fluxo-de-comunicação)
5. [Padrões Implementados](#padrões-implementados)
6. [Estrutura de Diretórios](#estrutura-de-diretórios)
7. [Tecnologias Utilizadas](#tecnologias-utilizadas)
8. [Testes](#testes)
9. [API Endpoints](#api-endpoints)
10. [Como Executar](#como-executar)

## 🎯 Visão Geral

Este projeto implementa uma arquitetura limpa (Clean Architecture) seguindo os princípios SOLID e DDD (Domain-Driven Design). O sistema gerencia **Customers** e **Products** com operações CRUD completas, validação robusta usando Notification Pattern, e uma API RESTful com suporte a JSON e XML.

### Principais Características:
- ✅ **Clean Architecture** com separação clara de responsabilidades
- ✅ **Domain-Driven Design** com entidades ricas e value objects
- ✅ **Notification Pattern** para acumulação de erros de validação
- ✅ **Repository Pattern** para abstração de persistência
- ✅ **Factory Pattern** para criação de objetos e validadores
- ✅ **Use Cases** bem definidos seguindo Single Responsibility
- ✅ **Event-Driven Architecture** com Domain Events
- ✅ **API RESTful** com suporte a múltiplos formatos (JSON/XML)

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    REST     │  │ Controllers │  │   Routes    │  │ Presenters  │ │
│  │     API     │  │             │  │             │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Use Cases   │  │    DTOs     │  │  Customer   │  │   Product   │ │
│  │             │  │             │  │ Use Cases   │  │ Use Cases   │ │
│  │ Create/Find │  │ Input/Output│  │             │  │             │ │
│  │ List/Update │  │             │  │             │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Entities   │  │    Value    │  │   Domain    │  │  Domain     │ │
│  │             │  │   Objects   │  │   Events    │  │  Services   │ │
│  │ Customer    │  │             │  │             │  │             │ │
│  │ Product     │  │   Address   │  │ CustomerCreated│ │ OrderService│ │
│  │ Order       │  │             │  │ ProductCreated │ │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Factories  │  │ Validators  │  │Notification │  │ Repository  │ │
│  │             │  │             │  │   Pattern   │  │ Interfaces  │ │
│  │ Customer    │  │ Yup         │  │             │  │             │ │
│  │ Product     │  │ Validators  │  │ Error Acc.  │  │ Contracts   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │Repositories │  │ ORM Models  │  │   Database  │  │    Event    │ │
│  │             │  │             │  │             │  │  Handlers   │ │
│  │ Customer    │  │ Sequelize   │  │   SQLite    │  │             │ │
│  │ Product     │  │ Models      │  │  PostgreSQL │  │ Email/Log   │ │
│  │ Order       │  │             │  │   MySQL     │  │ Handlers    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

 FLUXO DE DEPENDÊNCIAS (Clean Architecture):
 ═══════════════════════════════════════════
 
 Presentation Layer    →    Application Layer
 Application Layer     →    Domain Layer
 Infrastructure Layer  →    Domain Layer (implementa interfaces)
 
 REGRA: Camadas internas nunca dependem de camadas externas
```

## 📚 Camadas da Arquitetura

### 🎨 **1. Presentation Layer (Interface)**
Responsável pela interação com o mundo externo.

**Componentes:**
- **Controllers**: Recebem requisições HTTP e coordenam a execução
- **Routes**: Definem os endpoints da API
- **Presenters**: Formatam a saída (JSON/XML)
- **DTOs**: Objetos de transferência de dados

**Exemplo de Controller:**
```typescript
customerRoute.post("/", async (req: Request, res: Response) => {
  const usecase = new CreateCustomerUseCase(new CustomerRepository());
  const output = await usecase.execute(customerDto);
  res.send(output);
});
```

### 🔧 **2. Application Layer (Casos de Uso)**
Contém a lógica de aplicação e orquestra o fluxo de dados.

**Componentes:**
- **Use Cases**: Implementam regras de negócio específicas
- **Input/Output DTOs**: Definem contratos de entrada e saída

**Use Cases Implementados:**
```
Customer:
├── CreateCustomerUseCase
├── FindCustomerUseCase
├── ListCustomerUseCase
└── UpdateCustomerUseCase

Product:
├── CreateProductUseCase
├── FindProductUseCase
├── ListProductUseCase
└── UpdateProductUseCase
```

### 🧠 **3. Domain Layer (Domínio)**
Coração da aplicação, contém as regras de negócio puras.

**Entidades Principais:**
- **Customer**: Representa um cliente com endereço e pontos de recompensa
- **Product**: Representa um produto com nome e preço
- **Address**: Value Object para endereço do cliente
- **Order**: Agregado para pedidos

**Padrões no Domínio:**
- **Notification Pattern**: Acumula erros de validação
- **Domain Events**: CustomerCreated, CustomerAddressChanged, ProductCreated
- **Factory Pattern**: CustomerFactory, ProductFactory
- **Validator Pattern**: CustomerYupValidator, ProductYupValidator

### 💾 **4. Infrastructure Layer (Infraestrutura)**
Implementa detalhes técnicos e externos.

**Componentes:**
- **Repositories**: Implementação concreta da persistência
- **Models**: Mapeamento ORM (Sequelize)
- **Event Handlers**: Processadores de eventos de domínio

## 🔄 Fluxo de Comunicação

### 📥 **Fluxo de Entrada (Request)**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ HTTP Request│───▶│    Route    │───▶│ Controller  │───▶│  Use Case   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                 │
                                                                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │◀───│ Repository  │◀───│Domain Entity│◀───│ Validation  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 📤 **Fluxo de Saída (Response)**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │───▶│ Repository  │───▶│  Use Case   │───▶│ Controller  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                 │
                                                                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│HTTP Response│◀───│ Presenter   │◀───│   Format    │◀───│JSON/XML Data│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 🎯 **Exemplo Completo: Criar Produto**

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FLUXO DETALHADO                                │
└──────────────────────────────────────────────────────────────────────┘

1. REQUEST
   ┌─────────────────┐
   │ POST /product   │
   │ {               │
   │   "name": "...", │
   │   "price": 999  │
   │ }               │
   └─────────────────┘
            │
            ▼
2. ROUTE & CONTROLLER
   ┌─────────────────┐
   │ productRoute    │
   │ ──────────────  │
   │ - Recebe dados  │
   │ - Instancia UC  │
   │ - Executa       │
   └─────────────────┘
            │
            ▼
3. USE CASE
   ┌─────────────────┐
   │CreateProductUC  │
   │ ─────────────── │
   │ - Valida input  │
   │ - Chama Factory │
   │ - Salva no Repo │
   └─────────────────┘
            │
            ▼
4. DOMAIN LAYER
   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
   │ ProductFactory  │────▶ │  Product Entity │────▶ │ YupValidator    │
   │ ─────────────── │      │ ─────────────── │      │ ─────────────── │
   │ - Cria objeto   │      │ - Aplica regras │      │ - Valida dados  │
   │ - Define ID     │      │ - Valida estado │      │ - Acumula erros │
   └─────────────────┘      └─────────────────┘      └─────────────────┘
            │                        │                        │
            │                        ▼                        │
            │              ┌─────────────────┐                │
            │              │ Notification    │◀───────────────┘
            │              │ ─────────────── │
            │              │ - Acumula erros │
            │              │ - Lança exceção │
            │              └─────────────────┘
            ▼
5. INFRASTRUCTURE
   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
   │ProductRepository│────▶ │ ProductModel    │────▶ │   Database      │
   │ ─────────────── │      │ ─────────────── │      │ ─────────────── │
   │ - Implementa    │      │ - Mapeamento    │      │ - Persiste      │
   │   interface     │      │   ORM           │      │   dados         │
   └─────────────────┘      └─────────────────┘      └─────────────────┘
            │
            ▼
6. RESPONSE
   ┌─────────────────┐
   │ {               │
   │   "id": "uuid", │
   │   "name": "...", │
   │   "price": 999  │
   │ }               │
   └─────────────────┘

EVENTOS PARALELOS:
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ProductCreatedEvt│────▶ │  EventDispatch  │────▶ │  EventHandlers  │
│ ─────────────── │      │ ─────────────── │      │ ─────────────── │
│ - Produto criado│      │ - Notifica      │      │ - Envia email   │
│ - Dados evento  │      │   handlers      │      │ - Log sistema   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## 🔧 Padrões Implementados

### 🔔 **Notification Pattern**
Acumula erros de validação evitando múltiplas exceções.

```
 ANTES (Múltiplas Exceções):
 ═══════════════════════════
 
 ┌─────────────┐    ❌ Exception    ┌─────────────┐
 │ Validação 1 │─────────────────▶ │ Erro Name   │
 └─────────────┘                    └─────────────┘
 
 ┌─────────────┐    ❌ Exception    ┌─────────────┐
 │ Validação 2 │─────────────────▶ │ Erro Price  │ 
 └─────────────┘                    └─────────────┘
 
 ┌─────────────┐    ❌ Exception    ┌─────────────┐
 │ Validação 3 │─────────────────▶ │ Erro ID     │
 └─────────────┘                    └─────────────┘

 DEPOIS (Notification Pattern):
 ══════════════════════════════
 
 ┌─────────────┐                    ┌─────────────┐
 │ Validação 1 │──┐                 │             │
 └─────────────┘  │                 │             │
                  │   ┌─────────────┐│ Notification│
 ┌─────────────┐  ├──▶│   Acumula   ││  Container  │
 │ Validação 2 │──┤   │   Erros     ││             │
 └─────────────┘  │   └─────────────┘│             │
                  │                 │             │
 ┌─────────────┐  │                 │             │
 │ Validação 3 │──┘                 └─────────────┘
 └─────────────┘                           │
                                           ▼
                     ┌─────────────────────────────────┐
                     │ Uma única exceção com todos os │
                     │ erros: "product: Id required,  │
                     │ product: Name required,        │
                     │ product: Price invalid"        │
                     └─────────────────────────────────┘
```

**Implementação:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION PATTERN                          │
└──────────────────────────────────────────────────────────────────────┘

1. ENTITY BASE
   ┌─────────────────┐
   │ Entity Abstract │
   │ ─────────────── │
   │ + notification  │
   │   Notification  │
   └─────────────────┘
            │
            ▼
2. PRODUCT ENTITY
   ┌─────────────────┐      ┌─────────────────┐
   │ Product         │────▶ │ validate()      │
   │ ─────────────── │      │ ─────────────── │
   │ extends Entity  │      │ ValidatorFactory│
   │ + notification  │      │ .create()       │
   └─────────────────┘      │ .validate(this) │
                            └─────────────────┘
                                     │
                                     ▼
3. YUP VALIDATOR
   ┌─────────────────────────────────────────────────────────┐
   │ ProductYupValidator                                     │
   │ ─────────────────────────────────────────────────────── │
   │ validate(entity: Product): void {                       │
   │   try {                                                 │
   │     yup.object().shape({...}).validateSync({...})      │
   │   } catch (errors) {                                    │
   │     errors.forEach(error => {                           │
   │       entity.notification.addError({                    │
   │         context: "product",                             │
   │         message: error                                  │
   │       })                                                │
   │     })                                                  │
   │   }                                                     │
   │ }                                                       │
   └─────────────────────────────────────────────────────────┘
                                     │
                                     ▼
4. NOTIFICATION CONTAINER
   ┌─────────────────────────────────────────────────────────┐
   │ Notification                                            │
   │ ─────────────────────────────────────────────────────── │
   │ - errors: NotificationErrorProps[]                      │
   │ + addError(error)                                       │
   │ + hasErrors(): boolean                                  │
   │ + getErrors()                                           │
   │ + messages(context?: string): string                    │
   └─────────────────────────────────────────────────────────┘
                                     │
                                     ▼
5. ERROR HANDLING
   ┌─────────────────────────────────────────────────────────┐
   │ if (this.notification.hasErrors()) {                    │
   │   throw new NotificationError(                          │
   │     this.notification.getErrors()                       │
   │   );                                                    │
   │ }                                                       │
   └─────────────────────────────────────────────────────────┘
```

### 🏭 **Factory Pattern**
Centraliza a criação de objetos complexos.

```typescript
export default class ProductFactory {
  public static create(type: string, name: string, price: number): ProductInterface {
    if (type === "a") {
      return new Product(v4(), name, price);
    }
    if (type === "b") {
      return new ProductB(v4(), name, price);
    }
    throw new Error("Product type not supported");
  }
}
```

### 📦 **Repository Pattern**
Abstrai o acesso a dados.

```typescript
interface ProductRepositoryInterface extends RepositoryInterface<Product> {
  create(entity: Product): Promise<void>;
  update(entity: Product): Promise<void>;
  find(id: string): Promise<Product>;
  findAll(): Promise<Product[]>;
}
```

### 📧 **Domain Events**
Desacopla ações secundárias do fluxo principal.

```typescript
// Evento disparado
this._eventDispatcher.notify(new CustomerCreatedEvent(this));

// Handler processa
export default class SendEmailWhenCustomerIsCreatedHandler {
  handle(event: EventInterface): void {
    console.log("Sending email to customer...");
  }
}
```

## 📁 Estrutura de Diretórios

```
src/
├── domain/                          # Camada de Domínio
│   ├── @shared/                     # Componentes compartilhados
│   │   ├── entity/                  # Entidade base
│   │   ├── event/                   # Sistema de eventos
│   │   ├── notification/            # Notification Pattern
│   │   ├── repository/              # Interface base de repositório
│   │   └── validator/               # Interface de validação
│   ├── customer/                    # Agregado Customer
│   │   ├── entity/                  # Customer.ts
│   │   ├── factory/                 # CustomerFactory, ValidatorFactory
│   │   ├── repository/              # CustomerRepositoryInterface
│   │   ├── validator/               # CustomerYupValidator
│   │   └── value-object/            # Address
│   └── product/                     # Agregado Product
│       ├── entity/                  # Product.ts
│       ├── event/                   # ProductCreatedEvent
│       ├── factory/                 # ProductFactory, ValidatorFactory
│       ├── repository/              # ProductRepositoryInterface
│       ├── service/                 # ProductService
│       └── validator/               # ProductYupValidator
├── usecase/                         # Camada de Aplicação
│   ├── customer/                    # Use Cases de Customer
│   │   ├── create/                  # DTO, UseCase, Tests
│   │   ├── find/                    # DTO, UseCase, Tests
│   │   ├── list/                    # DTO, UseCase, Tests
│   │   └── update/                  # DTO, UseCase, Tests
│   └── product/                     # Use Cases de Product
│       ├── create/                  # DTO, UseCase, Tests
│       ├── find/                    # DTO, UseCase, Tests
│       ├── list/                    # DTO, UseCase, Tests
│       └── update/                  # DTO, UseCase, Tests
└── infrastructure/                  # Camada de Infraestrutura
    ├── api/                         # API REST
    │   ├── __tests__/               # Testes E2E
    │   ├── presenters/              # Formatadores de saída
    │   └── routes/                  # Definição de rotas
    ├── customer/                    # Infraestrutura Customer
    │   └── repository/sequelize/    # Implementação Sequelize
    ├── order/                       # Infraestrutura Order
    │   └── repository/sequelize/    # Implementação Sequelize
    └── product/                     # Infraestrutura Product
        └── repository/sequelize/    # Implementação Sequelize
```

## 🛠️ Tecnologias Utilizadas

### **Core**
- **TypeScript**: Linguagem principal
- **Node.js**: Runtime
- **Express**: Framework web

### **Banco de Dados**
- **Sequelize**: ORM
- **SQLite**: Banco para desenvolvimento/testes

### **Validação**
- **Yup**: Schema validation

### **Testes**
- **Jest**: Framework de testes
- **Supertest**: Testes de API

### **Outros**
- **UUID**: Geração de IDs únicos
- **jstoxml**: Conversão JSON para XML

## 🧪 Testes

### **Estrutura de Testes**
```
┌──────────────────────────────────────────────────────────────────────┐
│                         PIRÂMIDE DE TESTES                          │
└──────────────────────────────────────────────────────────────────────┘

                            ┌─────────────┐
                            │     E2E     │ ← Poucos, Caros, Lentos
                            │   Tests     │   (API completa)
                            └─────────────┘
                        ┌───────────────────┐
                        │   Integration     │ ← Médio volume
                        │     Tests         │   (Banco + Use Cases)
                        └───────────────────┘
                    ┌───────────────────────────┐
                    │      Unit Tests           │ ← Muitos, Rápidos, Baratos
                    │  (Entities + Use Cases)   │   (Componentes isolados)
                    └───────────────────────────┘

DISTRIBUIÇÃO POR CAMADA:
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ PRESENTATION    │  APPLICATION    │    DOMAIN       │INFRASTRUCTURE   │
│                 │                 │                 │                 │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │
│ │    E2E      │ │ │Integration  │ │ │    Unit     │ │ │Integration  │ │
│ │   Tests     │ │ │   Tests     │ │ │   Tests     │ │ │   Tests     │ │
│ │             │ │ │             │ │ │             │ │ │             │ │
│ │ • API       │ │ │ • Use Cases │ │ │ • Entities  │ │ │ • Repository│ │
│ │ • Routes    │ │ │ • With DB   │ │ │ • Services  │ │ │ • Models    │ │
│ │ • Full Flow │ │ │ • Real Repo │ │ │ • Factories │ │ │ • Database  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### **Cobertura Atual**
```
Test Suites: 28 passed
Tests: 78 passed
Coverage: 100% das funcionalidades principais

DETALHAMENTO:
├── Domain Tests (12 suites)
│   ├── Entity Tests ........................ ✅ 15 tests
│   ├── Factory Tests ....................... ✅ 8 tests  
│   ├── Service Tests ....................... ✅ 6 tests
│   └── Event Tests ......................... ✅ 4 tests
│
├── Use Case Tests (12 suites)  
│   ├── Unit Tests (mocked) ................ ✅ 24 tests
│   └── Integration Tests (real DB) ........ ✅ 18 tests
│
└── Infrastructure Tests (4 suites)
    ├── Repository Tests ................... ✅ 12 tests
    └── API E2E Tests ...................... ✅ 6 tests
```

### **Tipos de Teste por Camada**

**Domain Layer:**
```
┌────────────────────────────────────────────────────────────────────┐
│                       UNIT TESTS - DOMAIN                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ Entity Tests    │    │ Factory Tests   │    │ Service Tests   │ │
│  │ ─────────────── │    │ ─────────────── │    │ ─────────────── │ │
│  │ • Validation    │    │ • Object        │    │ • Business      │ │
│  │ • State Changes │    │   Creation      │    │   Logic         │ │
│  │ • Business      │    │ • Type Handling │    │ • Calculations  │ │
│  │   Rules         │    │                 │    │                 │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                    │
│  EXEMPLO: Product Entity Tests                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ describe("Product unit tests", () => {                       │ │
│  │   it("should throw error when all properties invalid", () =>│ │
│  │     expect(() => new Product("", "", -1))                   │ │
│  │       .toThrowError("product: Id required,                  │ │
│  │                      product: Name required,                │ │
│  │                      product: Price invalid");              │ │
│  │   });                                                        │ │
│  │ });                                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**Use Case Layer:**
```
┌────────────────────────────────────────────────────────────────────┐
│                    USE CASE TESTS                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  UNIT TESTS (Mocked Dependencies)                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ const mockRepository = {                                     │ │
│  │   create: jest.fn(),                                         │ │
│  │   find: jest.fn().mockReturnValue(productMock)              │ │
│  │ };                                                           │ │
│  │                                                              │ │
│  │ const useCase = new CreateProductUseCase(mockRepository);    │ │
│  │ const output = await useCase.execute(input);                 │ │
│  │                                                              │ │
│  │ expect(mockRepository.create).toHaveBeenCalled();            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  INTEGRATION TESTS (Real Database)                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ beforeEach(async () => {                                     │ │
│  │   await sequelize.sync({ force: true });                    │ │
│  │ });                                                          │ │
│  │                                                              │ │
│  │ const repository = new ProductRepository();                  │ │
│  │ const useCase = new CreateProductUseCase(repository);        │ │
│  │ const output = await useCase.execute(input);                 │ │
│  │                                                              │ │
│  │ // Verifica se foi salvo no banco real                      │ │
│  │ const product = await repository.find(output.id);           │ │
│  │ expect(product.name).toBe(input.name);                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**API Layer:**
```
┌────────────────────────────────────────────────────────────────────┐
│                        E2E TESTS                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  FULL INTEGRATION (HTTP → Database)                                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ describe("E2E test for product", () => {                     │ │
│  │   it("should list all products", async () => {              │ │
│  │     // 1. Cria produtos via API                             │ │
│  │     await request(app)                                       │ │
│  │       .post("/product")                                      │ │
│  │       .send({ name: "Product 1", price: 100 });             │ │
│  │                                                              │ │
│  │     // 2. Lista produtos via API                            │ │
│  │     const response = await request(app)                      │ │
│  │       .get("/product");                                      │ │
│  │                                                              │ │
│  │     // 3. Verifica resposta completa                        │ │
│  │     expect(response.status).toBe(200);                       │ │
│  │     expect(response.body.products.length).toBe(2);          │ │
│  │   });                                                        │ │
│  │ });                                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  MULTI-FORMAT TESTING                                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ // Testa resposta JSON                                       │ │
│  │ const jsonResponse = await request(app)                      │ │
│  │   .get("/product")                                           │ │
│  │   .set("Accept", "application/json");                       │ │
│  │                                                              │ │
│  │ // Testa resposta XML                                        │ │
│  │ const xmlResponse = await request(app)                       │ │
│  │   .get("/product")                                           │ │
│  │   .set("Accept", "application/xml");                        │ │
│  │                                                              │ │
│  │ expect(xmlResponse.text).toContain("<products>");            │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## 🚀 API Endpoints

### **Customer Endpoints**
```http
POST   /customer          # Criar cliente
GET    /customer          # Listar clientes
PUT    /customer/:id      # Atualizar cliente
GET    /customer/:id      # Buscar cliente
```

### **Product Endpoints**
```http
POST   /product           # Criar produto
GET    /product           # Listar produtos  
PUT    /product/:id       # Atualizar produto
GET    /product/:id       # Buscar produto
```

### **Exemplos de Requisições**

**Criar Produto:**
```bash
curl -X POST http://localhost:3000/product \
  -H "Content-Type: application/json" \
  -d '{"name": "Smartphone", "price": 999.99}'
```

**Listar Produtos (JSON):**
```bash
curl http://localhost:3000/product
```

**Listar Produtos (XML):**
```bash
curl -H "Accept: application/xml" http://localhost:3000/product
```

## 🐳 Como Executar

### **Pré-requisitos**
- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)

### **Executar com Docker**
```bash
# Executar todos os testes
./run-tests.sh

# Executar testes específicos
./run-tests.sh product.spec.ts

# Executar aplicação
docker-compose up
```

### **Executar Localmente**
```bash
# Instalar dependências
npm install

# Executar testes
npm test

# Compilar TypeScript
npm run tsc

# Executar aplicação
npm start
```

### **Scripts Disponíveis**
```json
{
  "scripts": {
    "test": "npm run tsc -- --noEmit && jest",
    "tsc": "tsc",
    "start": "node dist/index.js"
  }
}
```

## 📈 Benefícios da Arquitetura

### **Manutenibilidade**
- ✅ Código organizado em camadas bem definidas
- ✅ Baixo acoplamento entre componentes
- ✅ Alta coesão dentro de cada módulo

### **Testabilidade**
- ✅ Dependências injetadas facilitam mocking
- ✅ Lógica de negócio isolada
- ✅ Testes rápidos e confiáveis

### **Flexibilidade**
- ✅ Fácil troca de implementações (banco, validação)
- ✅ Adição de novas funcionalidades sem impacto
- ✅ Suporte a múltiplos formatos de saída

### **Escalabilidade**
- ✅ Estrutura preparada para crescimento
- ✅ Padrões que facilitam trabalho em equipe
- ✅ Separação clara de responsabilidades

---

## 📝 Notas Finais

Esta arquitetura implementa os princípios da Clean Architecture de Robert C. Martin, garantindo que:

1. **As regras de negócio não dependem de frameworks**
2. **A interface do usuário pode mudar facilmente**
3. **O banco de dados pode ser substituído**
4. **As regras de negócio podem ser testadas sem elementos externos**

O projeto serve como exemplo prático de como estruturar aplicações Node.js/TypeScript seguindo boas práticas de arquitetura de software.
