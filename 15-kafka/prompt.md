Você é um arquiteto de software e instrutor. Gere um documento técnico inicial, extremamente didático e acionável, para um projeto chamado “Sistema de Pedidos com Kafka – E-commerce Didático”. O documento deve estar em Português do Brasil.

Objetivo do documento

Explicar como construir o projeto em fases encadeadas (cada fase prepara a próxima).

Cada Fase contém Etapas, e cada Etapa contém Microfases (tarefas granulares).

Em cada item, inclua: propósito, artefatos gerados, critérios de aceite, comandos essenciais (quando aplicável) e checklist de validação.

O foco é didático + realista: mostrar conceitos centrais do Kafka no dia a dia, com uma UI web visual que exibe o fluxo dos eventos.

Stack e princípios (fixos)

Infra via Docker Compose: Kafka (usando Redpanda ou Apache Kafka + KRaft), Kafka UI (Provectus), Schema Registry (Apicurio ou Confluent compatível), Kafka Connect, ksqlDB (opcional), PostgreSQL (persistência), Prometheus + Grafana (observabilidade básica).

Microserviços (monorepo ou multirepo, escolha e justifique):

checkout-api (Producer principal) — Node.js (NestJS).

payment-service (Consumer/Producer) — Node.js (NestJS).

inventory-service (Consumer/Producer) — Node.js (NestJS).

notification-service (Consumer) — Node.js (NestJS).

orchestrator-saga (core de orquestração, timeouts, DLQ handling) — Node.js (NestJS).

dashboard-web (UI visual) — React + Vite, WebSocket/Server-Sent Events para “telemetria de eventos” em tempo real.

Padrões Kafka a serem explorados ao longo das fases:

Modelagem de tópicos (nomes, chaves, partições), compaction vs retention, replicação.

Idempotência, acks, retries/backoff, DLQ e reprocessamento seguro.

Consumer Groups, rebalanceamento, offset management, exactly-once (EOS v2) quando aplicável.

Schema Evolution (Avro/JSON Schema), compatibility modes.

Windowing e joins com Kafka Streams/ksqlDB (em fase avançada).

Observabilidade: métricas-chave (lag por grupo, taxa de produção/consumo, erros por segundo), dashboards básicos no Grafana, e logs estruturados.

Testes: testes locais com dados simulados, testes de carga leves e ensaios de falha (derrubar serviço, aumentar latência, forçar erro de schema).

Escopo funcional (domínio de e-commerce, didático)

Fluxo principal: checkout → pagamento → reserva/baixa de estoque → confirmação/envio → notificação ao cliente.

Tópicos base (detalhe nomes e chaves em cada fase): orders.new, payments.requested, payments.confirmed, inventory.reserved, inventory.failed, orders.confirmed, notifications.events, orders.dlq, payments.dlq, etc.

Chaves de particionamento: orderId (explique por quê), quando usar compaction, quando usar múltiplas partições e impactos na ordenação.

Formato do documento

Estruture exatamente como abaixo:

Visão Geral e Mapa Didático

Desenho textual da arquitetura (legenda dos componentes).

Tabela “conceito Kafka → onde aparece no projeto”.

Critérios globais de sucesso e como a UI web “conta a história do evento” em tempo real.

Fase 0 — Fundamentos e Infra

Etapa 0.1 – Docker Compose de Base

Microfases: escolha do broker (Redpanda ou Kafka KRaft), subir Kafka UI, criar rede, variáveis de ambiente.

Artefatos: docker-compose.yml, .env.

Comandos essenciais: docker compose up -d, criação de tópicos via CLI/Kafka UI.

Checklist: broker acessível, UI acessível, criar/deletar tópico de teste.

Etapa 0.2 – Observabilidade Mínima

Microfases: Prometheus + Grafana, exporter do broker, dashboards prontos.

Etapa 0.3 – Schema Registry

Microfases: subir registry, registrar primeiro schema (Avro/JSON), testar compatibilidade.

Fase 1 — Producer/Consumer “Hello, Orders”

Etapa 1.1 – checkout-api (Producer)

Microfases: endpoint POST /orders, validação payload, chave orderId, idempotência do producer (enable.idempotence/config análoga), acks, retries.

Artefatos: serviço NestJS, client Kafka, script de seed.

Critérios de aceite: mensagem chega ao tópico orders.new, visível no Kafka UI.

Etapa 1.2 – dashboard-web (primeira versão)

Microfases: conectar a um “telemetry-gateway” (Node) que consome tópicos e “emite” para UI via WebSocket/SSE; lista em tempo real de eventos recebidos.

Etapa 1.3 – payment-service (Consumer→Producer)

Microfases: ler orders.new, simular processamento, publicar em payments.requested/payments.confirmed com probabilidade de falha configurável para cenários didáticos.

Checklist: lag controlado, sem perda de ordenação por chave.

Fase 2 — Estoque, Orquestração e Regras de Negócio

Etapa 2.1 – inventory-service

Microfases: consumir payments.confirmed, reservar/baixar estoque em PostgreSQL, publicar inventory.reserved ou inventory.failed.

Schema Evolution: evoluir schema de inventory.* e demonstrar compatibilidade.

Etapa 2.2 – orchestrator-saga

Microfases: ouvir cadeia de eventos, manter estado por orderId, lidar com timeouts, cenários de compensação, publicar orders.confirmed ou enviar para DLQ.

DLQ: criar orders.dlq e estratégia de reprocessamento manual/automático.

Etapa 2.3 – notification-service

Microfases: consumir orders.confirmed e inventory.failed, enviar e registrar notificação (simulada), publicar notifications.events para UI.

Etapa 2.4 – dashboard-web (v2)

Microfases: timeline visual por pedido (nós e arestas), filtros por status, indicadores (taxa de sucesso, tempo médio por etapa), gráficos (Recharts).

Fase 3 — Robustez Operacional

Etapa 3.1 – Confiabilidade & Exactly-Once (quando aplicável)

Microfases: transações Kafka (EOS v2) entre consumo e produção nos serviços críticos; idempotent consumer patterns.

Etapa 3.2 – Estratégias de Retry e Backoff

Microfases: tópicos de retry com delays progressivos (ex.: orders.retry.5s, orders.retry.30s), poison-pill handling.

Etapa 3.3 – Ensaios de Falha

Microfases: derrubar payment-service, simular lentidão, quebrar schema propositalmente, validar telemetria e DLQ.

Etapa 3.4 – Observabilidade (v2)

Microfases: dashboards para lag por consumer group, taxa de erro, p95/p99 de tempo de ponta a ponta, alertas simples.

Fase 4 — Stream Processing Didático

Etapa 4.1 – ksqlDB / Kafka Streams

Microfases: criar stream a partir de notifications.events e orders.*, janelas por tempo, agregações por status; tabela de “KPIs de pedidos” usada pela UI.

Etapa 4.2 – Enriquecimento e Joins

Microfases: simular tabela de clientes/produtos (PostgreSQL → Debezium/Kafka Connect opcional), join para enriquecer eventos.

Fase 5 — Polimento e Extensões

Etapa 5.1 – Segurança Básica

Microfases: SASL/PLAIN local, secrets via .env, noções de RBAC na UI (didático).

Etapa 5.2 – Experiências Didáticas Extras

Microfases: alternar partições e observar ordenação; alterar keys e medir impacto; mudar retention e demonstrar compaction.

Etapa 5.3 – Guia de Reprocessamento

Microfases: documentação prática: como reprocessar DLQ de forma segura; scripts utilitários.

Modelos e Especificações

Esquemas de eventos (Avro/JSON Schema) para cada tópico, com campos exigidos/ opcionais, exemplos de evolução de schema.

Tabela de tópicos: nome, finalidade, chave, partições sugeridas, política (delete/compact), retenção, consumidor(es) e produtor(es).

Variáveis .env e ports padronizados.

Makefile/NPX scripts úteis (ex.: make up, make seed, make topics, make ksql).

Playbooks (“Como validar cada fase”)

Sequência de comandos curl/HTTPie para disparar pedidos.

Passos na UI do Kafka para inspecionar mensagens.

Como observar o dashboard em tempo real e interpretar métricas.

Checklist de “pronto para seguir à próxima fase”.

Roadmap de Entrega

Estimativa de esforço por fase (didático).

Ordem recomendada de implementação (Fase 0 → 1 → 2 → 3 → 4 → 5).

Critério para “MVP didático” (até Fase 2) e “MVP avançado” (até Fase 4).

IMPORTANTE:

Entregue o documento final em Markdown estruturado, com títulos e subtítulos claros, tabelas quando apropriado e blocos de código para comandos e exemplos de payloads.

Escreva de forma didática, passo a passo, evitando jargão sem explicação.

Sempre feche cada Fase/Etapa com Critérios de Aceite e Como validar.

O documento deve ser executável cognitivamente: após lê-lo, o leitor consegue implementar fase a fase.