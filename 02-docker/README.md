# Full Cycle Rocks - Desafio Go

Este projeto é uma solução para o desafio de criar uma aplicação Go que imprime "Full Cycle Rocks!!" em uma imagem Docker de menos de 2MB.

## ✅ Desafio Concluído!

- **Tamanho da imagem**: 1.43MB (✅ menor que 2MB)
- **Resultado**: "Full Cycle Rocks!!" 
- **Docker Hub**: https://hub.docker.com/repository/docker/jsturiao/fc_02_docker/general

## Como executar

### Localmente
```bash
go run main.go
```

### Docker - Direto do Docker Hub
```bash
docker run jsturiao/fc_02_docker
```

### Docker - Build local
```bash
# Construir a imagem
docker build -t jsturiao/fc_02_docker .

# Executar a imagem
docker run jsturiao/fc_02_docker

# Verificar o tamanho da imagem
docker images jsturiao/fc_02_docker
```

## Estratégia para menos de 2MB

1. **Multi-stage build**: Usa Ubuntu para compilar e depois copia apenas o binário para uma imagem `scratch`
2. **Compilação otimizada**: Usa flags `-ldflags "-s -w"` para remover símbolos de debug
3. **CGO desabilitado**: `CGO_ENABLED=0` evita dependências C
4. **Imagem scratch**: A menor imagem possível, contendo apenas o que é necessário

## Resultado esperado

```
Full Cycle Rocks!!
```

## 🐳 Docker Hub

**URL do Repositório**: https://hub.docker.com/repository/docker/jsturiao/fc_02_docker/general

**Imagem Pública**: `jsturiao/fc_02_docker`

Para executar diretamente do Docker Hub:
```bash
docker run jsturiao/fc_02_docker
```

## 📊 Especificações Técnicas

- **Tamanho final**: 1.43MB
- **Base**: Ubuntu 20.04 (build) + scratch (final)
- **Linguagem**: Go 1.x
- **Multi-stage**: Sim
- **Compressão**: Símbolos removidos (-ldflags "-s -w")
