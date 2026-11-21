# Tech stack — Behavior Viewer

Stack escolhida para atender [requisitos.md](requisitos.md) e [arquitetura.md](arquitetura.md). Cada escolha importante tem justificativa e alternativa descartada. As decisões formais estão em [adr/README.md](adr/README.md).

Versões: a linha principal é indicada. Versões exatas são fixadas no `package-lock.json` e revisadas na Fase 0 (ver [roadmap.md](roadmap.md)).

---

## 1. Visão geral

| Camada | Escolha | Versão de referência |
|---|---|---|
| Linguagem | TypeScript (modo estrito) | 5.x |
| Runtime | Node.js LTS | 22 |
| Backend / API | Fastify | 5.x |
| Parser Gherkin | `@cucumber/gherkin` e `@cucumber/messages` | oficiais |
| Relatórios XML | `fast-xml-parser` | 4.x |
| Banco local | SQLite via `better-sqlite3` | 11.x |
| Validação | Zod | 3.x |
| Config YAML | `yaml` | 2.x |
| Log | Pino | 9.x |
| Frontend | React + Vite | React 19, Vite 6 |
| Roteamento | React Router | 7.x |
| Estilo | CSS Modules + variáveis CSS (tokens do design) | — |
| Ícones | `lucide-react` com `stroke-width` 1.5 e forma ajustada ao design | — |
| Fontes | Inter e JetBrains Mono (self-hosted, via `@fontsource`) | — |
| Dados do cliente | TanStack Query | 5.x |
| Testes unitários | Vitest | 3.x |
| Testes de componente | Testing Library | — |
| Testes E2E e visuais | Playwright | — |
| Acessibilidade | `@axe-core/playwright` | — |
| Lint / formatação | ESLint (flat config) + Prettier | — |
| Monorepo | npm workspaces | — |
| Contêiner | Docker (multi-stage), Docker Compose v2 | — |
| CI/CD | GitHub Actions, Buildx (multi-arch), GHCR | — |
| Versionamento | SemVer, Conventional Commits, Changesets | — |

---

## 2. Justificativas

### 2.1 TypeScript em todo o projeto

Um único idioma para servidor, domínio e interface. O domínio (`packages/domain`) é compartilhado entre API e SPA, o que evita divergência de regra de status entre o que o servidor calcula e o que a tela mostra. O ecossistema BDD em JavaScript é o mais maduro: o parser oficial do Cucumber é escrito em TypeScript.

**Alternativa descartada:** Go, com binário único. Seria ótimo para distribuição, mas o parser Gherkin oficial em Go é menos usado, e o time teria duas linguagens para manter o domínio e a interface.

### 2.2 Fastify no backend

Rápido, com validação de schema nativa e API `inject` para testes sem subir porta. Adequado a uma API local pequena.

**Alternativas:** Express (menos tipagem e mais lento de configurar), Hono (ótimo, mas menos maduro no ecossistema Node para servir SPA estática com plugins).

### 2.3 `@cucumber/gherkin` para parsing

É o parser oficial usado pelo próprio Cucumber em todas as linguagens. Suporta `Rule`, `Scenario Outline` e todos os idiomas de Gherkin (incluindo `pt`). Gera mensagens de erro com linha, o que alimenta o requisito RF-12.

**Alternativa descartada:** expressões regulares próprias. Quebram com multilinha, docstrings e idiomas.

### 2.4 SQLite com `better-sqlite3`

Requisito de histórico (RF-20) e de seleção de projetos (RF-02) pede persistência, mas o escopo é local e de um usuário. SQLite não exige serviço extra, fica em um arquivo no volume e é fácil de fazer backup.

**Alternativa descartada:** Postgres em container separado. Complica o `docker compose up` (RNF-02) sem benefício para uso local.

**Por que `better-sqlite3` e não `node:sqlite`:** o módulo nativo do Node ainda é experimental na linha 22. Revisitar quando estiver estável.

**Atenção:** o binário nativo exige imagem Debian (`node:22-slim`), não Alpine, para evitar builds em musl.

### 2.5 React + Vite no frontend

SPA estática servida pelo próprio backend: não há servidor de front-end em produção. Vite gera build rápido e simples. React tem o maior ecossistema para componentes complexos (lista virtualizada, controle segmentado, modo apresentação).

**Alternativas:** Svelte (menos ecossistema de testes e de componentes prontos), Next.js (desnecessário sem SSR; aumenta a imagem e a complexidade).

### 2.6 CSS Modules com variáveis CSS, sem framework de componentes

O design define tokens exatos (cores, tipografia, raios) que não batem com nenhum sistema de componentes padrão. Usar um framework geraria conflito com o visual. Variáveis CSS mapeiam 1 a 1 para os tokens de [design/README.md](design/README.md) (§2), e CSS Modules isola estilos sem runtime.

**Alternativas descartadas:**
- *Tailwind:* funciona, mas o design usa nomes semânticos (status, superfície); o Tailwind geraria classes genéricas e o HTML ficaria difícil de comparar com o canvas.
- *MUI, Chakra, shadcn/ui:* trazem padrões visuais próprios que precisariam ser sobrescritos. Ainda assim, a ADR-0011 deixa aberta a possibilidade de usar primitivas acessíveis (Radix) sem estilo, se o time quiser reduzir o trabalho de acessibilidade.

### 2.7 Fontes self-hosted

O canvas carrega Inter e JetBrains Mono do Google Fonts. O requisito RNF-04 proíbe chamadas de rede em runtime, então as fontes são empacotadas com `@fontsource` e servidas pelo próprio app.

### 2.8 TanStack Query para dados da API

Cache, revalidação e estados de carregamento e erro, sem gerenciador de estado global. Adequado para uma interface quase toda de leitura.

### 2.9 Playwright para E2E, visual e acessibilidade

Um único runner cobre fluxos, capturas de tela dos artboards (RNF-07) e auditoria axe (RNF-08). Roda em Chromium no CI.

### 2.10 Docker multi-stage com Node slim

Imagem final apenas com `node_modules` de produção e o build. Usuário não-root. Build multi-arch com Buildx para `amd64` e `arm64` (RNF-01, RNF-02).

---

## 3. Estrutura de versionamento e contribuição

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Ver [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Releases:** Changesets gera o `CHANGELOG.md` e a versão SemVer. Tag `vX.Y.Z` dispara a publicação da imagem.
- **Branches:** `main` protegida; trabalho em branches curtas com PR e revisão.

---

## 4. Dependências previstas e critérios

Ao adicionar dependência, justificar no PR:

1. Ela resolve um requisito que não é trivial de implementar?
2. Tem manutenção ativa e licença compatível com MIT?
3. Funciona nos três sistemas operacionais e nas duas arquiteturas (amd64 e arm64)?
4. Adiciona menos de 1 MB ao bundle da SPA, ou está justificada?

---

## 5. Itens de stack a validar na Fase 0

- Compatibilidade do `better-sqlite3` com `node:22-slim` em `linux/arm64`.
- Tamanho da imagem final (meta: menos de 250 MB).
- Desempenho da varredura de 5.000 cenários no WSL2 (RNF-06).
- Licença de Inter e JetBrains Mono (ambas OFL, compatíveis com MIT).
