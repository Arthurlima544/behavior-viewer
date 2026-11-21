# Roadmap — Behavior Viewer

Plano de entregas em fases. Cada fase tem um critério de saída verificável. Uma fase só começa quando a anterior cumpre seu critério.

Requisitos por fase estão marcados com a prioridade de [requisitos.md](requisitos.md). Decisões pendentes que bloqueiam uma fase estão marcadas com **(bloqueia)**.

---

## Estado atual

Atualizado em 2026-11-21.

- **Concluído e testado:** descoberta e parsing (Fase 1), API, interface e apresentação (Fases 2 e 4), ingestão de relatórios (Fase 3), imagem Docker validada com `healthy`, workspace somente leitura e porta em `127.0.0.1`.
- **Parcial:** Fase 0 (modelos de issue e Changesets pendentes; tamanho da imagem e build arm64 nativo não medidos). Fase 2 (responsividade em 390 e 768 px e axe nas outras telas não verificados). Fase 3 (persistência do histórico entre reinícios não verificada).
- **Pendente:** benchmark de desempenho (RNF-06), cobertura medida ≥ 80% (RNF-12), regressão visual dos artboards, Fase 5 inteira.

Testes atuais: 50 unitários (domínio 15, servidor 29, interface 6) e 11 E2E.

## Fase 0 — Fundação

**Objetivo:** repositório pronto para colaboração e pipeline funcionando, sem funcionalidade ainda.

**Entregas**

- [x] Repositório Git inicializado, `main` protegida, modelo de PR.
- [x] Monorepo com npm workspaces (`apps/server`, `apps/web`, `packages/domain`).
- [x] TypeScript estrito, ESLint, Prettier, Vitest e Playwright configurados.
- [x] Documentação de [requisitos](requisitos.md), [design](design/README.md), [arquitetura](arquitetura.md), [stack](tech-stack.md) e [ADRs](adr/README.md) commitada.
- [x] `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`.
- [ ] Modelos de issue (bug, funcionalidade, regra de negócio mal reportada) e de PR.
- [x] `Dockerfile` multi-stage e `docker-compose.yml` que sobe um endpoint de saúde.
- [x] CI: lint, testes, build e imagem multi-arch (`amd64` e `arm64`).
- [x] Fontes Inter e JetBrains Mono empacotadas (RNF-04).
- [x] Fixtures iniciais: `flutter-app/`, `ts-web/`, `java-api/`.
- [ ] Validação dos itens de [tech-stack.md §5](tech-stack.md#5-itens-de-stack-a-validar-na-fase-0).
- [x] Decisões **bloqueantes** resolvidas: ADR-0010 (nome) e ADR-0012 (licença).

**Critério de saída:** `docker compose up` sobe o contêiner, `GET /api/v1/health` responde 200, e o CI passa em `main`.

---

## Fase 1 — Descoberta e leitura do BDD

**Objetivo:** o sistema encontra projetos, stacks e regras, sem interface ainda.

**Entregas**

- [x] Scanner de workspace com ignorados padrão (RF-01).
- [x] Detecção de stack por manifesto (RF-04) e agrupamento em projeto (RF-03).
- [x] Leitura de `.behavior.yml` (RF-05).
- [x] Parser Gherkin com `# language:` (RF-06, RF-07) e erros isolados por arquivo (RF-12).
- [x] Extração de regras por tag `@RN-` (RF-08), IDs provisórios (RF-09) e regras implícitas (RF-10).
- [ ] Campos de negócio: descrição, situação, resultado (RF-11). **(bloqueia parte do RF-11: ADR-0006)**
- [x] Consolidação por ID e por título (RF-13, RF-14).
- [x] Matriz de presença e divergências (RF-15, RF-16).
- [x] Endpoints `projetos`, `funcionalidades`, `regras`, `regras/:id`, `matriz`, `divergencias`, `erros` (§6 da arquitetura).
- [x] Testes unitários do parser e do consolidador com cobertura ≥ 80% (RNF-12).
- [ ] Benchmark de scan com fixture gerada (RNF-06).

**Critério de saída:** para as fixtures, a API retorna as regras, stacks e matriz esperadas, e o benchmark cumpre a meta de RNF-06.

**Bloqueio:** **ADR-0005** (formato do ID) precisa estar confirmada antes de fechar as fixtures finais.

---

## Fase 2 — Interface fiel ao design (leitura)

**Objetivo:** as três telas de leitura estão prontas e batem com o design.

**Entregas**

- [x] Shell com sidebar e rotas (RF-48), tokens CSS de [design/README.md §2](design/README.md#2-tokens).
- [x] Tela 1, Visão geral: KPIs, cards de projeto, matriz, divergências (RF-23 a RF-26).
- [x] Tela 2, Catálogo: funcionalidades, filtros de texto, stack e status, "Só divergentes", grupos e linhas (RF-27 a RF-32).
- [x] Tela 3, Detalhe: cabeçalho, descrição, cenários Gherkin/texto, "Onde a regra está", "Copiar link" (RF-33 a RF-36, RF-37, RF-40).
- [x] Busca global com atalho por sistema (RF-47).
- [x] Breadcrumb em todas as telas (RF-49).
- [x] Estados vazios e de erro (RF-52).
- [ ] Responsividade em 390, 768 e 1440 px (RNF-09).
- [ ] Regressão visual dos quatro artboards em CI (RNF-07).
- [ ] Auditoria axe sem violações graves (RNF-08).

**Critério de saída:** capturas das três telas batem com o design dentro da tolerância, e a auditoria de acessibilidade passa.

**Bloqueio:** **ADR-0009** (tema) e **ADR-0011** (primitivas) antes de começar a interação de controles complexos.

---

## Fase 3 — Resultados de execução

**Objetivo:** o status deixa de ser estimado e passa a vir dos relatórios.

**Entregas**

- [x] Ingestão de Cucumber JSON (RF-17) e JUnit XML (RF-17).
- [x] Associação cenário ↔ resultado (RF-18) e status por regra × stack (RF-19).
- [x] Persistência do histórico e faixa de 14 execuções (RF-20).
- [x] Ref do repositório e data de sincronização (RF-21).
- [x] Gherkin para copiar (RF-38, conforme ADR-0007). **(bloqueia: ADR-0007)**
- [x] Faixa "Últimas 14 execuções" na tela de detalhe (RF-39).
- [x] Reexecução de varredura manual e periódica (RF-50).
- [x] Configuração global por variáveis de ambiente (RF-51).

**Critério de saída:** a fixture `java-api/` com um cenário falhando aparece como "Falhando · 3/4" no detalhe e na visão geral, e o histórico sobrevive a reiniciar o contêiner (RNF-14).

---

## Fase 4 — Modo apresentação

**Objetivo:** apresentar regras de uma funcionalidade em tela cheia.

**Entregas**

- [x] Tela 4, apresentação, com progresso, pontos, anterior e próxima (RF-42 a RF-44, RF-46).
- [x] Cartões de situação e resultado (RF-43). **(bloqueia parte: ADR-0006)**
- [x] Navegação por teclado (RF-45). **(bloqueia: ADR-0008)**
- [x] "Apresentar seleção" a partir do catálogo com filtros ativos.
- [x] Rota de apresentação com regra inicial (RF-48).
- [x] Teste E2E do fluxo "abrir catálogo → apresentar → navegar → sair".

**Critério de saída:** a apresentação funciona por teclado e por mouse, e a regressão visual da tela 4 passa.

---

## Fase 5 — Release 1.0 (MVP)

**Objetivo:** primeira versão pública e utilizável por times reais.

**Entregas**

- [ ] Exportação de regras em JSON (RF-53, se priorizado).
- [ ] Testes manuais documentados em macOS (Intel e Apple Silicon), Windows (WSL2) e Linux (RNF-01).
- [ ] Guia de solução de problemas (Docker, caminhos Windows, permissões Linux).
- [ ] Imagens publicadas no registro de contêineres com tags `vX.Y.Z` e `latest`.
- [ ] Changelog e notas de release.
- [ ] Revisão de segurança dos itens de [arquitetura §9](arquitetura.md#9-segurança).
- [ ] Teste de rede bloqueada: todas as telas carregam sem internet (RNF-04).

**Critério de saída:** todos os requisitos com prioridade **M** estão cumpridos e verificados.

---

## Pós-MVP (backlog)

Itens sem data. Entram no backlog público como issues com o rótulo `roadmap`.

| Item | Requisito | Observação |
|---|---|---|
| Envio de relatórios pelo CI via API com token | RF-22 | Traz a origem "Sincronizado pelo CI" do design de volta com dados reais. |
| Tema claro | ADR-0009 | Só com artboard de referência. |
| Inglês e demais idiomas | RNF-10, ADR-0013 | Arquivos de tradução já previstos. |
| Mais linguagens: Python (behave), C# (Reqnroll/SpecFlow), Go (godog) | RF-04 | Um adaptador por stack. |
| Exportação HTML estática das regras | — | Para publicar em wiki. |
| Visualização de histórico de Git por regra | RF-33 (evolução) | Mostrar quando e quem mudou a regra. |
| Modo multiusuário | ADR-0002 | Exige banco externo e autenticação. |

---

## Decisões que bloqueiam o início de cada fase

| Fase | Decisão | ADR |
|---|---|---|
| 0 | Nome do produto e licença | [0010](adr/README.md#adr-0010-nome-do-produto), [0012](adr/README.md#adr-0012-licença-mit) |
| 1 | Formato do ID de regra | [0005](adr/README.md#adr-0005-identificador-de-regra-por-tag-rn) |
| 2 | Tema e primitivas de acessibilidade | [0009](adr/README.md#adr-0009-tema-somente-escuro), [0011](adr/README.md#adr-0011-primitivas-de-acessibilidade) |
| 3 | Significado de "Copiar .feature" | [0007](adr/README.md#adr-0007-significado-de-copiar-feature-para-o-app) |
| 4 | Textos de situação/resultado e teclado | [0006](adr/README.md#adr-0006-situação-e-resultado-esperado-na-apresentação), [0008](adr/README.md#adr-0008-navegação-por-teclado-no-modo-apresentação) |
