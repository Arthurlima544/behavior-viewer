# Arquitetura — Behavior Viewer

Este documento descreve **como** os requisitos de [requisitos.md](requisitos.md) são atendidos. A escolha das tecnologias está em [tech-stack.md](tech-stack.md) e as decisões em aberto em [adr/README.md](adr/README.md).

---

## 1. Visão de contexto

```
┌──────────────────────────── máquina do desenvolvedor ────────────────────────────┐
│                                                                                   │
│   ~/code/marketplace/   ~/code/backoffice/   ~/code/pagamentos/   (repositórios)  │
│            │                    │                    │                            │
│            └────────────────────┴────────────────────┘                            │
│                                 │  bind mount  :ro                               │
│                                 ▼                                                 │
│   ┌──────────────────── container behavior-viewer ──────────────────────┐          │
│   │                                                                     │          │
│   │   Scanner ─► Parser Gherkin ─► Domínio ─► API REST /api/v1          │          │
│   │      ▲                            │                   │             │          │
│   │      │                            ▼                   ▼             │          │
│   │  Ingestor de relatórios ──► SQLite (volume)     SPA React (estática) │          │
│   │  (Cucumber JSON, JUnit)                                 │             │          │
│   └─────────────────────────────────────────────────────────┼─────────────┘          │
│                                                             │ 127.0.0.1:8787       │
│                                                             ▼                      │
│                                                   navegador (localhost)            │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Um único container. O backend serve a API e os arquivos estáticos da SPA. Não há banco externo nem serviço auxiliar.

---

## 2. Componentes

| Componente | Responsabilidade | Requisitos |
|---|---|---|
| **Scanner** | Percorre as raízes do workspace, identifica projetos (`.feature`), stacks (manifestos) e arquivos `.behavior.yml`. Respeita exclusões. | RF-01 a RF-05 |
| **Parser Gherkin** | Converte cada `.feature` em AST usando `@cucumber/gherkin`. Trata `# language:` e erros por arquivo. | RF-06, RF-07, RF-12 |
| **Extrator de regras** | Transforma o AST em Regras (bloco `Rule:` + tag de ID), cenários e campos de negócio. Gera IDs provisórios e marca "regra implícita". | RF-08 a RF-11 |
| **Consolidador** | Agrupa implementações por ID de regra (ou título normalizado). Calcula matriz de presença e divergências. | RF-13 a RF-16 |
| **Ingestor de relatórios** | Lê Cucumber JSON e JUnit XML, associa a cenários e calcula status por regra × stack. Persiste histórico. | RF-17 a RF-21 |
| **Armazenamento** | SQLite com histórico de execuções, seleção de projetos e estado de sincronização. O índice de regras é reconstruído a partir dos arquivos. | RNF-14, RF-02, RF-20 |
| **API** | Endpoints JSON versionados (`/api/v1`). Validação de entrada com schemas. | RF-23 a RF-49 |
| **SPA** | Interface React fiel ao design. Rotas por URL, busca global, modo apresentação. | RF-23 a RF-49, RNF-07 a RNF-10 |
| **Agendador** | Dispara o scan na inicialização, quando o usuário pede e a cada intervalo configurado. | RF-50 |

---

## 3. Modelo de domínio

```
Projeto 1 ──── N Stack
   │                │
   │                └── N Arquivo de feature (.feature)
   │                          │
   └── N Funcionalidade ◄─────┘   (uma por arquivo/bloco Feature)
                 │
                 └── N Regra (canônica, por ID)
                          │
                          ├── N Cenário  (por implementação)
                          └── N Implementação ──► Stack  (uma por stack onde a regra existe)
                                   │
                                   └── N Execução (resultado por cenário, histórico)
```

### 3.1 Entidades principais

```ts
type Stack = 'flutter' | 'typescript' | 'java' | 'gherkin-generico';

interface Projeto {
  id: string;             // slug estável, derivado do nome ou do .behavior.yml
  nome: string;
  raiz: string;           // caminho dentro do workspace
  origem: 'auto' | 'config';
  selecionado: boolean;   // RF-02
  ref?: { branch: string; commit: string };   // RF-21
  sincronizadoEm?: string;                    // ISO 8601
  stacks: Stack[];
}

interface Funcionalidade {
  id: string;
  projetoId: string;
  nome: string;
  descricao: string;
  arquivo: string;        // caminho relativo à raiz do projeto
  idioma: string;         // do cabeçalho # language:
  tags: string[];
}

interface Regra {
  id: string;             // RN-CUP-003 ou provisório
  projetoId: string;
  funcionalidadeId: string;
  titulo: string;
  descricao: string;      // texto livre do bloco Rule:
  situacao?: string;      // Given do cenário representativo (RF-11)
  resultado?: string;     // Then do cenário representativo (RF-11)
  tags: string[];
  origemId: 'tag' | 'titulo' | 'implicita' | 'provisorio';  // RF-08 a RF-10, RF-14
  avisos: string[];
}

interface Implementacao {
  regraId: string;
  stack: Stack;
  arquivo: string;
  linha: number;
  runner?: string;        // "Cucumber-JVM", "Playwright + Cucumber"
  cenarios: CenarioImpl[];
  status: 'passando' | 'falhando' | 'pendente' | 'sem-execucao';  // RF-19
  ultimaExecucao?: string;
}

interface CenarioImpl {
  nome: string;
  tipo: 'scenario' | 'outline';
  passos: { palavra: 'Dado' | 'Quando' | 'Então' | 'E' | 'Mas'; texto: string }[];
  exemplos?: string[][];
  resultado?: 'passou' | 'falhou' | 'pendente' | 'sem-execucao';
}
```

Um campo `status` por regra × stack e um agregado por regra são **calculados**, não armazenados. Só as execuções e a seleção de projetos são persistidas.

### 3.2 Regra de status (RF-19)

| Condição | Status |
|---|---|
| A regra não existe na stack | `sem-cobertura` |
| Existe, sem relatório de execução para nenhum cenário | `sem-execucao` |
| Algum cenário falhou | `falhando` |
| Algum cenário está pendente (steps indefinidos) e nenhum falhou | `pendente` |
| Todos os cenários passaram | `passando` |

Prioridade: `falhando` > `pendente` > `sem-execucao` > `passando`. Para o agregado do projeto, a barra usa a contagem de regras em cada estado.

### 3.3 Consolidação (RF-13, RF-14)

1. Coletar todas as implementações de todos os projetos selecionados.
2. Agrupar por `(projetoId, regraId)`. Quando `origemId = titulo`, agrupar por `(projetoId, tituloNormalizado)`.
3. Cada grupo vira uma `Regra` com a lista de `Implementacao`.
4. Divergência = regra com ao menos uma stack do projeto onde está ausente.

---

## 4. Pipeline de varredura

```
[raízes configuradas]
        │
        ▼
 1. Caminhar em árvore (ignora node_modules, build, target, .git, .dart_tool, ...)
        │
        ▼
 2. Para cada diretório com .feature:
        ├── procurar .behavior.yml (sobe até a raiz do workspace)  ──► projeto declarado
        └── procurar manifestos (pubspec.yaml, package.json, pom.xml, build.gradle*)
                                                                    ──► stack
        │
        ▼
 3. Agrupar diretórios em projetos (RF-03):
        - com .behavior.yml: o projeto é a pasta da config
        - sem config: o projeto é o diretório-pai comum mais próximo com manifesto ou .git
        │
        ▼
 4. Parse de cada .feature (@cucumber/gherkin)            ──► erros isolados por arquivo
        │
        ▼
 5. Extrair regras, cenários e implementações
        │
        ▼
 6. Ingerir relatórios configurados (Cucumber JSON, JUnit XML)
        │
        ▼
 7. Consolidar, calcular status, matriz e divergências
        │
        ▼
 8. Gravar histórico e marcar sincronizadoEm
```

Os passos 4 a 7 rodam em paralelo por arquivo, com limite de concorrência igual ao número de CPUs. Reexecução só reprocessa arquivos com `mtime` ou tamanho alterados (cache por caminho + hash).

### 4.1 Regras de detecção de stack (RF-04)

| Stack | Manifesto | Sinal adicional |
|---|---|---|
| Flutter / Dart | `pubspec.yaml` com `flutter:` ou `sdk: flutter` | `.feature` em `test/` ou `integration_test/` |
| TypeScript / JavaScript | `package.json` com `@cucumber/cucumber` ou `@playwright/test` | `cucumber.js`, `cucumber.cjs` ou `cucumber.mjs` |
| Java | `pom.xml` ou `build.gradle(.kts)` com `io.cucumber` | `src/test/resources/features/` |
| Gherkin genérico | nenhum dos acima | — |

Ordem de precedência: `.behavior.yml` > manifesto > sinal adicional.

### 4.2 Arquivo `.behavior.yml` (RF-05)

```yaml
# .behavior.yml — opcional, na raiz do projeto
nome: Marketplace
stacks:
  - id: flutter
    caminho: app/
    relatorios:
      - build/test-results/*.xml          # JUnit
  - id: typescript
    caminho: web/
    relatorios:
      - reports/cucumber.json             # Cucumber JSON
  - id: java
    caminho: api/
    relatorios:
      - target/cucumber.json
ignorar:
  - "**/exemplos/**"
```

Sem o arquivo, o scanner usa a detecção automática e os caminhos padrão de relatório (ver §5).

---

## 5. Ingestão de relatórios (RF-17, RF-18)

| Formato | Origem típica | Como associa |
|---|---|---|
| Cucumber JSON | cucumber-js (`--format json:`), Cucumber-JVM (`json:`) | `feature.uri` + `scenario.name` |
| JUnit XML | Maven Surefire, Gradle, `flutter test` com reporter JUnit | `classname` (feature) + `name` (cenário) |

Caminhos padrão procurados quando não configurados: `target/cucumber.json`, `reports/cucumber.json`, `build/cucumber.json`, `build/test-results/**/*.xml`, `target/surefire-reports/*.xml`.

Relatório sem associação (cenário não encontrado no `.feature`) entra como aviso "execução órfã" na visão geral, não como erro.

Cenários `Scenario Outline` são associados pelo nome base; cada linha de `Examples` gera um resultado que é agregado no cenário (qualquer falha = falhou).

---

## 6. API REST (`/api/v1`)

| Método | Caminho | Uso | Requisito |
|---|---|---|---|
| GET | `/health` | Estado, versão, último scan | RNF-13 |
| GET | `/projetos` | Lista projetos com contadores e status agregados | RF-23, RF-24 |
| PUT | `/projetos/:id/selecao` | Incluir/excluir projeto da visão | RF-02 |
| POST | `/varreduras` | Dispara novo scan (assíncrono, retorna `202`) | RF-50 |
| GET | `/projetos/:id/funcionalidades` | Lista funcionalidades com contagem | RF-27 |
| GET | `/projetos/:id/regras` | Regras com filtros `q`, `stack`, `status`, `tag`, `divergentes` | RF-30 a RF-32 |
| GET | `/projetos/:id/matriz` | Matriz de presença por funcionalidade × stack | RF-15, RF-25 |
| GET | `/projetos/:id/divergencias` | Lista de divergências | RF-16, RF-26 |
| GET | `/regras/:id?projeto=` | Detalhe completo da regra | RF-33 a RF-39 |
| GET | `/regras/:id/gherkin?projeto=&stack=` | Gherkin da regra para copiar | RF-38 |
| GET | `/busca?q=` | Busca global | RF-47 |
| GET | `/erros` | Erros de leitura e avisos | RF-09, RF-12 |

Respostas de lista usam paginação por cursor quando passam de 200 itens. Erros seguem o formato `{ "erro": { "codigo", "mensagem", "detalhes" } }`.

Rotas de página no front-end: `/`, `/projetos/:projeto`, `/projetos/:projeto/regras/:id`, `/projetos/:projeto/apresentar/:funcionalidade` (RF-48).

---

## 7. Persistência

SQLite em `/data/behavior.db`, no volume `behavior-data`.

| Tabela | Conteúdo |
|---|---|
| `projeto_selecao` | `projeto_id`, `selecionado` |
| `sincronizacao` | `projeto_id`, `iniciado_em`, `concluido_em`, `ref`, `duracao_ms` |
| `execucao` | `projeto_id`, `stack`, `cenario_chave`, `resultado`, `executado_em` (mantém ao menos as 14 últimas por cenário, RF-20) |
| `cache_arquivo` | `caminho`, `hash`, `tamanho`, `mtime` (para reprocessar só o que mudou) |

O índice de regras, funcionalidades e implementações **não** é persistido. É reconstruído em memória a cada varredura. Isso mantém a fonte de verdade nos arquivos (RNF-14).

Migrações versionadas no código (`migrations/0001_inicial.sql`...).

---

## 8. Execução em Docker (RNF-01, RNF-02, RNF-03, RNF-05)

### 8.1 Imagem

- Build em múltiplos estágios: `deps` → `build` (compila TypeScript e a SPA) → `runtime` (somente produção).
- Base `node:22-slim` (Debian), para evitar problemas de binário nativo do SQLite em musl.
- Usuário não-root (`behavior`, UID 10001).
- `HEALTHCHECK` chamando `/api/v1/health`.
- Multi-arch: `linux/amd64` e `linux/arm64` (Macs com Apple Silicon e Linux em ARM).

### 8.2 `docker-compose.yml` de referência

```yaml
services:
  behavior-viewer:
    image: ghcr.io/<org>/behavior-viewer:latest
    ports:
      - "127.0.0.1:8787:8787"          # RNF-05: somente localhost
    environment:
      BEHAVIOR_WORKSPACE: /workspace     # raízes separadas por vírgula
      BEHAVIOR_SCAN_INTERVAL: 60         # segundos (RF-50)
      BEHAVIOR_PORT: 8787
    volumes:
      - ~/code:/workspace:ro            # RNF-03: somente leitura
      - behavior-data:/data
    restart: unless-stopped

volumes:
  behavior-data:
```

### 8.3 Notas por sistema operacional

| SO | Requisito | Observação |
|---|---|---|
| macOS | Docker Desktop | Compartilhamento de pastas: adicionar a pasta do workspace em Settings → Resources → File sharing se necessário. |
| Windows | Docker Desktop com backend WSL2 | Os projetos devem estar no sistema de arquivos do WSL (`\\wsl$\...`) ou em um drive montado no Docker Desktop. Caminhos Windows são convertidos pelo Docker. Desempenho do scan é melhor dentro do WSL. |
| Linux | Docker Engine e plugin Compose | Montagem direta. Garantir permissão de leitura para o UID do container (ou ajustar com `user:`). |

---

## 9. Segurança

| Ameaça | Mitigação |
|---|---|
| Escrita acidental no código do usuário | Mount `:ro`; o app não tem código de escrita no workspace. |
| Exposição na rede local | Porta publicada em `127.0.0.1`. Sem autenticação porque é uso individual; documentar que expor a porta em `0.0.0.0` é inseguro. |
| XSS via conteúdo de `.feature` | Renderização como texto (sem `dangerouslySetInnerHTML`). CSP restritiva: `default-src 'self'`. |
| Path traversal na API | Caminhos são resolvidos a partir de IDs internos de projeto, nunca recebidos do cliente. Validação com allowlist de raízes. |
| Symlinks que saem do workspace | O scanner não segue symlinks por padrão. |
| Dependências vulneráveis | `npm audit` e Dependabot no CI. |

---

## 10. Desempenho

| Meta | Como |
|---|---|
| Scan de 500 arquivos / 5.000 cenários em < 10 s | Parse em paralelo; cache por hash; leitura em streaming de relatórios grandes. |
| Catálogo com 2.000 regras em < 1 s | Consulta paginada/filtrada no backend; lista virtualizada no front-end acima de 200 linhas. |
| Início do container em < 15 s | Imagem slim; scan inicial em background, a API responde antes do fim do scan. |

---

## 11. Testes

| Nível | Ferramenta | Cobertura alvo |
|---|---|---|
| Unidade (parser, extrator, consolidador, status) | Vitest | ≥ 80% (RNF-12) |
| Integração (scanner + fixtures reais) | Vitest + `fixtures/` | Uma fixture por stack e uma com `# language: pt` |
| API | Vitest + supertest-like (Fastify `inject`) | Todos os endpoints de §6 |
| Componentes | Vitest + Testing Library | Componentes de §3 do design |
| End-to-end | Playwright | Fluxos: descobrir, filtrar, abrir regra, apresentar |
| Visual | Playwright (screenshots) | Quatro artboards, viewport 1440 px, tolerância definida no repositório |
| Acessibilidade | axe-core no Playwright | Sem violações graves em cada rota |
| Imagem Docker | Teste de fumaça no CI | `docker run` + `GET /api/v1/health` |

Fixtures em `fixtures/`: `flutter-app/`, `ts-web/`, `java-api/`, `pt-br/`, `erros/` (arquivo inválido), `sem-rule/` (regras implícitas). Os projetos de fixture são pequenos e contêm relatórios gerados de verdade.

---

## 12. Estrutura do repositório (proposta)

```
behavior-viewer/
├── apps/
│   ├── server/              # Fastify: scanner, parser, API, ingestor
│   │   └── src/
│   └── web/                 # React + Vite: SPA
│       └── src/
├── packages/
│   └── domain/              # tipos e regras de status (compartilhados)
├── fixtures/                # projetos BDD de exemplo para testes
├── tests/
│   ├── e2e/                 # Playwright
│   └── visual/              # capturas do design
├── docs/                    # esta documentação
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── .behavior.yml.example
├── .github/workflows/
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── LICENSE
```

Monorepo com workspaces do npm. `packages/domain` concentra a lógica pura de status e consolidação, que é testada sem I/O.
