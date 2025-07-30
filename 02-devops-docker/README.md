# Desafio Full Cycle - Nginx + Node.js + MySQL

## Como executar

1. Execute o comando para subir os containers:
```bash
docker-compose up -d --build
```

2. Acesse a aplicação em:
```
http://localhost:8080
```

3. A cada refresh da página, um novo nome será adicionado ao banco de dados e exibido na lista.

## Documentação

- 🔧 **[FUNCIONAMENTO-DETALHADO.md](./FUNCIONAMENTO-DETALHADO.md)** - Funcionamento interno da aplicação com fluxos detalhados

## Para parar os containers

```bash
docker-compose down
```

## Para limpar dados e recomeçar

```bash
docker-compose down -v
docker-compose up -d --build
```

## Arquitetura

- **Nginx**: Proxy reverso na porta 8080
- **Node.js**: Aplicação backend na porta 3000 (interna)
- **MySQL**: Banco de dados na porta 3306 (interna)

A aplicação retorna `Full Cycle Rocks!` e uma lista de nomes cadastrados no banco de dados.
