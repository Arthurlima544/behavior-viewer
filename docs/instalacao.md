# Guia de instalação

Este guia cobre a instalação com Docker (recomendada para uso) e a execução em modo de desenvolvimento. Para entender o que cada parte faz, veja o [README](../README.md).

## 1. Pré-requisitos

| Sistema | Para uso (Docker) | Para desenvolvimento |
|---|---|---|
| macOS (Intel ou Apple Silicon) | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Node.js 22 LTS |
| Windows 10/11 | Docker Desktop com backend WSL2 | Node.js 22 LTS (no WSL2 é mais simples) |
| Linux (x86_64 ou arm64) | Docker Engine e o plugin Compose | Node.js 22 LTS |

Confira a instalação:

```bash
docker --version
docker compose version
```

## 2. Instalação com Docker

Na pasta do projeto:

```bash
docker compose up --build
```

A primeira execução baixa as dependências e compila a imagem, o que pode levar alguns minutos. Quando aparecer a linha `Behavior Viewer iniciado`, abra **http://localhost:8787**.

Para rodar em segundo plano:

```bash
docker compose up --build -d     # sobe
docker compose logs -f           # acompanha os logs
docker compose down              # para (os dados são mantidos)
```

### Escolhendo a pasta dos projetos

Por padrão, o contêiner enxerga a sua pasta pessoal, em modo somente leitura. Você escolhe os projetos pela interface, então não precisa configurar caminhos. Para limitar o acesso a uma pasta específica:

```bash
HOST_HOME=~/code docker compose up --build
```

No Windows (PowerShell):

```powershell
$env:HOST_HOME="C:\Users\seu-usuario\code"
docker compose up --build
```

Trocar `HOST_HOME` muda o caminho interno dos projetos. Se você fizer isso depois de registrar projetos, registre-os de novo.

### Permissões no Linux

Pastas pessoais costumam ser legíveis só pelo próprio usuário. Por isso o contêiner roda com o seu usuário e grupo, sem privilégios de administrador. Em muitos casos isso já é o padrão (`1000:1000`), mas confirme com:

```bash
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up --build
```

Se a pasta que você escolheu aparecer como "sem permissão", este é o ajuste a fazer.

### Windows

- Mantenha os projetos em um drive compartilhado no Docker Desktop (**Settings → Resources → File sharing**), ou dentro do WSL2.
- O desempenho da varredura é melhor quando os projetos estão no sistema de arquivos do WSL2.

### macOS

- Se a pasta não aparecer ou der erro de acesso, confirme em **Settings → Resources → File sharing** que a pasta está liberada para o Docker.

## 3. Primeiro uso

1. Abra **http://localhost:8787**. A visão geral começa vazia.
2. Clique em **Adicionar projeto**.
3. Navegue pelas pastas ou digite o caminho, como `~/code/meu-projeto`.
4. O Behavior Viewer mostra os projetos encontrados, com funcionalidades, cenários e stacks. Marque os que quiser e clique em **Registrar**.

Os projetos ficam guardados no volume `behavior-data`, então sobrevivem a reinicializações do contêiner.

## 4. Desenvolvimento sem Docker

Pré-requisito: Node.js 22 LTS.

```bash
npm ci
npm run dev
```

- Interface: **http://localhost:5173**
- API: **http://localhost:8787**

Para os testes:

```bash
npm test              # unitários (domínio, servidor e interface)
npm run test:e2e      # navegador real, com um servidor de teste em 8790
npm run lint
npm run typecheck
```

O `test:e2e` gera a interface e o servidor antes de rodar, e usa os projetos de exemplo em `tests/fixtures/`.

## 5. Configuração

Todas as opções são variáveis de ambiente. Veja a tabela completa no [README](../README.md#configuração). As mais usadas:

| Variável | Exemplo | Efeito |
|---|---|---|
| `BEHAVIOR_SCAN_INTERVAL` | `120` | Intervalo da detecção de mudanças, em segundos |
| `BEHAVIOR_PORT` | `9000` | Porta do servidor (ajuste também o `ports` do `docker-compose.yml`) |
| `BEHAVIOR_LOG_LEVEL` | `debug` | Mais detalhes nos logs |

## 6. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `port is already allocated` ao subir | Outro programa usa a porta 8787 | Pare o programa ou troque a porta no `docker-compose.yml` |
| "caminho fora das pastas permitidas" | A pasta está fora de `BEHAVIOR_BROWSE_ROOTS` (ou de `HOST_HOME`) | Use `HOST_HOME` com uma pasta que contenha o projeto |
| "sem permissão para listar esta pasta" (Linux) | O contêiner não tem o seu usuário | Use `HOST_UID=$(id -u) HOST_GID=$(id -g)` |
| Cenários aparecem como "Sem execução" | A suíte não gerou relatório que o Behavior Viewer conhece | Gere um relatório Cucumber JSON ou JUnit XML e configure o caminho em `stacks` no `.behavior.yml` |
| O alerta de alterações não some | As mudanças ainda não foram sincronizadas | Clique em **Sincronizar** |
| Projeto não aparece na lista | Não há arquivo `.feature` na pasta escolhida | Escolha a raiz do projeto ou da stack |
| Imagem de captura não carrega | O arquivo não está dentro da pasta do projeto, ou o caminho no índice é absoluto | Use caminhos relativos à raiz do projeto em `reports/capturas/indice.json` |
| Build do Docker falha ao compilar o SQLite (arm64) | Falta de binário pré-compilado para a plataforma | Use a versão mais recente do Docker Desktop; o estágio de build já inclui as ferramentas de compilação |

Se nada disso resolver, abra uma issue com o sistema operacional, a versão do Docker e a saída de `docker compose logs`.
