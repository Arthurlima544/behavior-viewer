# Design — Behavior Viewer

Especificação visual extraída do canvas de referência (tipo "Design", 4 artboards em 1440 px).

A implementação deve seguir este documento. Quando houver conflito entre este arquivo e o canvas, o canvas vence e este arquivo deve ser atualizado. Os valores abaixo são os valores exatos do design, não aproximações.

Os artboards são fluidos (`expand: fill`). A largura de 1440 px é só a referência de layout.

---

## 1. Telas

| # | Artboard (título no canvas) | Rota | Requisitos | Tamanho ref. |
|---|---|---|---|---|
| 1 | Visão geral multi-projeto | `/` | RF-23 a RF-26, RF-47 | 1440 × 1240 |
| 2 | Catálogo de regras | `/projetos/:projeto` | RF-27 a RF-32 | 1440 × 1080 |
| 3 | Detalhe da regra | `/projetos/:projeto/regras/:id` | RF-33 a RF-41 | 1440 × 1280 |
| 4 | Modo apresentação | `/projetos/:projeto/apresentar/:funcionalidade` | RF-42 a RF-46 | 1440 × 960 |

Layout de shell comum às telas 1 a 3: sidebar fixa à esquerda (largura mínima 240 px) e área principal com padding `40px 48px 64px`. A tela 4 não tem sidebar: tem cabeçalho próprio e conteúdo centralizado com `max-width: 1120px`.

### 1.1 Tela 1 — Visão geral

- **Sidebar:** logo, navegação (Visão geral, Catálogo de regras, Modo apresentação) e lista "Projetos" com contagem de regras por projeto. Rodapé: "Sincronizado pelo CI / há 12 min".
- **Cabeçalho:** título "Visão geral", subtítulo "Regras de negócio extraídas dos testes BDD de N projetos.", campo de busca com `⌘K`, botão "Apresentar".
- **Indicadores:** 4 cards em grade (`repeat(auto-fit, minmax(200px, 1fr))`): Regras de negócio, Funcionalidades, Cenários, Passando (%).
- **Projetos:** legenda das stacks no cabeçalho da seção, e cards em grade (`minmax(280px, 1fr)`). Cada card: nome, descrição, ícones das stacks, três contadores, barra de status segmentada, rodapé com ref e sincronização.
- **Presença por camada:** tabela (funcionalidade × stack) com coluna de total e painel lateral "Divergências".

### 1.2 Tela 2 — Catálogo

- **Sidebar:** igual à visão geral, com o projeto ativo listado na seção "Projetos" (fundo `#1A1A1A` no item ativo).
- **Cabeçalho:** trilha `Projetos / Marketplace`, título "Catálogo de regras", subtítulo `214 regras em 18 funcionalidades · app Flutter, web TypeScript e API Java`, botão "Apresentar seleção".
- **Barra de filtros:** campo de busca, separador vertical, botões "Todas", "Flutter", "TypeScript", "Java", separador, menu "Status: todos", botão "Só divergentes".
- **Corpo em duas colunas:** lista de funcionalidades (coluna esquerda, `max-width: 240px`) e grupos de regras (coluna direita).

### 1.3 Tela 3 — Detalhe da regra

- **Cabeçalho:** trilha `Marketplace / Cupons de desconto / RN-CUP-003`, ID em mono, título (34 px), badge de status ("Falhando na web"), tags, autoria/última alteração, botões "Copiar link" (secundário) e "Apresentar" (primário).
- **Coluna principal:** cartão "Em linguagem de negócio" com o texto da regra; seção "Cenários" com controle segmentado Gherkin / Texto simples; cartões de cenário com cabeçalho (nome + lista de execuções por linguagem) e corpo em mono; botão "Mostrar mais 2 cenários".
- **Coluna lateral (340 px mín.):** "Onde a regra está" (um cartão por stack) e "Últimas 14 execuções" (uma faixa por stack).

### 1.4 Tela 4 — Modo apresentação

- **Cabeçalho:** logo pequeno, trilha `Marketplace / Cupons de desconto`, contador `1 de 5`, botão "Sair da apresentação".
- **Barra de progresso:** 2 px de altura no topo, preenchida em `(n / N) × 100%`.
- **Conteúdo:** rótulo `REGRA 01 · RN-CUP-001`, título em 56 px, "por que" em 22 px, dois cartões lado a lado ("Situação" escuro, "Resultado esperado" claro invertido), e a linha "Garantida por testes em" com os estados Web, App e API.
- **Rodapé:** botão "Anterior" (contorno), pontos de navegação, botão "Próxima" (primário).

---

## 2. Tokens

### 2.1 Cores

Fundo escuro com escala de cinza. Não há cor de marca: a identidade vem do contraste.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0A0A0A` | Fundo da aplicação |
| `--surface-0` | `#0C0C0C` | Bloco de código Gherkin |
| `--surface-1` | `#0F0F0F` | Linha de regra |
| `--surface-2` | `#111111` | Cards, cartões de cenário, painéis |
| `--surface-hover` | `#1A1A1A` | Item ativo da navegação, hover |
| `--surface-chip` | `#1F1F1F` | Botão segmentado ativo |
| `--border-subtle` | `#171717` | Divisor entre linhas de regra |
| `--border` | `#1F1F1F` | Bordas de cards e divisores de seção |
| `--border-strong` | `#262626` | Bordas de campos, botões fantasma, tags |
| `--border-icon` | `#2A2A2A` | Borda de ícone de stack ativo |
| `--border-button` | `#333333` | Borda de botão de contorno |
| `--border-dashed` | `#333333` / `#3A3A3A` / `#404040` | Estados "inativo" e "sem teste" |
| `--text` | `#FAFAFA` | Texto principal, botão primário |
| `--text-strong` | `#F5F5F5` | Texto de destaque (descrição de regra) |
| `--text-2` | `#E5E5E5` | Ícones de stack ativos |
| `--text-3` | `#D4D4D4` | Texto de navegação e nomes de arquivo |
| `--text-4` | `#B5B5B5` | Subtítulo da apresentação |
| `--text-muted-2` | `#A3A3A3` | Texto secundário, labels |
| `--text-muted` | `#8A8A8A` | Labels em caixa-alta, IDs, metadados |
| `--text-icon-muted` | `#737373` | Ícone de seta, anel de status pendente |
| `--text-inverse-muted` | `#525252` | Label sobre fundo claro |
| `--status-pass` | `#FAFAFA` | Ponto de status "passando" (sólido) |
| `--status-pending` | `#737373` | Ponto de status "pendente" (anel de 1,5 px) |
| `--status-fail` | `#F87171` | Ponto de status "falhando" |
| `--status-fail-text` | `#FCA5A5` | Texto de "falhando" e de notas |
| `--status-fail-border` | `#3F2424` | Borda de chip "falhando" |
| `--status-fail-border-strong` | `#5B2B2B` | Borda de chip "em correção" |
| `--on-primary` | `#0A0A0A` | Texto sobre botão primário |

Regra de acessibilidade: status é sempre comunicado por **cor + forma + texto**. Passando é sólido, pendente é anel, falhando é vermelho com texto. Vermelho e verde nunca aparecem juntos como únicos diferenciadores (o design usa vermelho apenas para falha).

### 2.2 Tipografia

Duas famílias, ambas self-hosted (RNF-04):

- **Inter** (400, 500, 600, 700): interface e texto.
- **JetBrains Mono** (400, 500, 600): IDs, tags, caminhos, contadores, Gherkin, metadados.

| Papel | Família | Tamanho | Peso | Extras |
|---|---|---|---|---|
| Título da apresentação | Inter | 56 px | 600 | `letter-spacing: -0.03em`, `line-height: 1.08` |
| Título do detalhe | Inter | 34 px | 600 | `letter-spacing: -0.02em`, `line-height: 1.2` |
| Título de página | Inter | 32 px | 600 | `letter-spacing: -0.02em` |
| Por que (apresentação) | Inter | 22 px | 400 | `line-height: 1.55`, cor `--text-4` |
| Cartão de apresentação | Inter | 20 px | 400 / 500 | `line-height: 1.5` |
| Texto de negócio | Inter | 17 px | 400 | `line-height: 1.6` |
| Título de seção, nome de projeto | Inter | 18 px | 600 | |
| Logo | Inter | 16 px | 600 | `letter-spacing: -0.01em` |
| Título de regra | Inter | 15 px | 500 | `line-height: 1.4` |
| Navegação, botões | Inter | 14 px | 500 | |
| Descrição, subtítulo | Inter | 13 a 15 px | 400 | |
| Badge de stack, tag | JetBrains Mono | 11 a 12 px | 400 | |
| Eyebrow (rótulo caixa-alta) | Inter | 11 a 12 px | 600 | `letter-spacing: 0.06em` a `0.08em`, `text-transform: uppercase` |
| Indicador grande (KPI) | Inter | 36 px | 600 | `letter-spacing: -0.02em` |
| Código Gherkin | JetBrains Mono | 14 px | 400 | `line-height: 1.6` |

### 2.3 Forma e espaçamento

| Elemento | Raio | Altura | Padding horizontal |
|---|---|---|---|
| Logo quadrado | 7 px | 28 px | — |
| Ícone de stack | 8 px | 30 a 32 px | — |
| Item de navegação | 8 px | 38 px | 10 px |
| Item de projeto na sidebar | 8 px | 34 px | 10 px |
| Campo de busca | 8 px | 38 a 40 px | 12 a 14 px |
| Botão padrão | 8 px | 38 a 40 px | 12 a 16 px |
| Botão da apresentação | 10 px | 44 px | 16 a 18 px |
| Chip de status | 13 px (pílula) | 26 px | 10 px |
| Tag de regra | 4 px | — | 6 a 7 px |
| Card de projeto / cenário | 12 px | — | 20 a 24 px |
| Cartão da apresentação | 16 px | — | 28 px |
| Pílula da stack na apresentação | 20 px | 40 px | 14 px |
| Ponto de status | 50% | 8 px | — |

Espaçamentos recorrentes (px): `4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 72`. Gaps de seção: 28 a 40 px. Gaps de lista: 2 px (navegação), 12 px (cards).

Bordas: 1 px sólida em `--border`. Separador vertical de filtros: 1 × 24 px em `--border-strong`.

### 2.4 Ícones

Estilo: linha (`stroke-width` 1,5; 1,8 para setas de menu), 16 px nos botões e 14 px nos badges, `viewBox 0 0 20 20`. Ícones são inline SVG, não emoji.

Ícones de stack (identidade fixa, usar sempre estes desenhos):

| Stack | Ícone | Desenho |
|---|---|---|
| Flutter (app) | Celular | retângulo vertical `x=5 y=2 w=10 h=16 rx=2` com linha de home `M9 15h2` |
| TypeScript (web) | Janela | retângulo `x=2 y=4 w=16 h=12 rx=2` com barra `M2 8h16` |
| Java (API) | Servidor | dois retângulos empilhados `x=3 y=3 w=14 h=6` e `y=11`, com pontos `M6 6h1 M6 14h1` |

Outros ícones: busca (círculo + linha), navegação (grade 2×2, lista, apresentação), links (corrente), seta de menu (chevron), fechar (X), anterior/próxima (chevron).

### 2.5 Movimento

O design não define animações. Padrão do projeto: transições de cor de 150 ms e nenhuma animação de entrada. Respeitar `prefers-reduced-motion`.

---

## 3. Componentes

| Componente | Variantes e estados | Tela(s) |
|---|---|---|
| `AppShell` (sidebar + área) | com sidebar, sem sidebar (apresentação) | 1, 2, 3 |
| `SidebarNav` | item ativo, item inativo | todas |
| `SidebarProjects` | projeto ativo, inativo; contagem | todas |
| `Logo` | padrão | todas |
| `Breadcrumb` | itens em link, último item em mono | 2, 3, 4 |
| `Button` | primário (fundo claro), contorno, fantasma, menu (status), segmentado | todas |
| `SegmentedControl` | Gherkin/Texto simples; Gherkin ativo | 3 |
| `SearchField` | vazio, com texto, com atalho (`⌘K` / `Ctrl+K`) | 1, 2 |
| `FilterBar` | separadores, botões de stack com estado | 2 |
| `StackBadge` | ativo (borda sólida, texto claro), inativo (tracejado, texto cinza), com rótulo ou só ícone | 1, 2, 3, 4 |
| `StatusDot` | passando (sólido), pendente (anel), falhando (vermelho); com rótulo acessível | 2, 3 |
| `StatusChip` | pílula com ponto e texto "Falhando na web" | 3 |
| `Tag` | `@cupom`, `@critico` (mono, 11 px) | 2, 3 |
| `KpiCard` | rótulo, valor, subtítulo | 1 |
| `ProjectCard` | com ícones, contadores, barra segmentada, rodapé | 1 |
| `StatusBar` | segmentos passando/pendente/falhando em % | 1 |
| `CoverageMatrix` | célula ok (ponto + `n`), célula lacuna (tracejada vermelha + `x/y`) | 1 |
| `DivergencesPanel` | título, parágrafos com destaque, link | 1 |
| `FeatureNav` | item ativo com fundo `--surface-hover`, contagem | 2 |
| `RuleGroup` | cabeçalho (nome, arquivo, resumo) + lista | 2 |
| `RuleRow` | status, ID, título + tags, badges, número de cenários, chevron | 2 |
| `ScenarioCard` | cabeçalho com execuções por linguagem, corpo Gherkin ou texto | 3 |
| `GherkinLine` | palavra-chave (`Dado`, `Quando`, `Então`, `E`) em peso 600; `E` em cor muted | 3 |
| `ImplementationCard` | estados passando, falhando, sem cobertura (borda tracejada) | 3 |
| `RunHistoryStrip` | 14 células, `passou` / `falhou` / `sem execução`, com `title` | 3 |
| `PresentationHeader` | logo, trilha, contador `n de N`, sair | 4 |
| `ProgressBar` | 2 px, largura percentual | 4 |
| `StepDots` | ponto ativo (28 px) e inativo (10 px), todos clicáveis, com `aria-label` | 4 |
| `RuleSlide` | rótulo, título, por que, cartões Situação/Resultado, stacks garantidas | 4 |
| `StackPill` | ok (sólida, texto claro), em correção (vermelha), sem teste (tracejada) | 4 |

### 3.1 Estados de cada linha de regra (tela 2)

| Estado | Ponto | Texto no `title` / rótulo acessível |
|---|---|---|
| Passando | sólido `--status-pass` | "Passando" |
| Pendente | anel 1,5 px `--status-pending` | "Pendente" |
| Falhando | sólido `--status-fail` | "Falhando" |

### 3.2 Estados de badge de stack (tela 2, linha de regra)

| Estado | Borda | Ícone |
|---|---|---|
| Presente | `1px solid #2A2A2A` | `#E5E5E5` |
| Ausente | `1px dashed #262626` | `#404040` |

---

## 4. Conteúdo e textos de referência

Os textos abaixo são do design e devem ser usados como strings iniciais de pt-BR (RNF-10).

- Navegação: "Visão geral", "Catálogo de regras", "Modo apresentação".
- Ações: "Apresentar", "Apresentar seleção", "Copiar link", "Sair da apresentação", "Anterior", "Próxima", "Mostrar mais 2 cenários", "Copiar .feature para o app", "Só divergentes".
- Filtros: "Todas", "Status: todos", "Filtrar por texto, ID ou @tag".
- Rótulos: "Regras de negócio", "Funcionalidades", "Cenários", "Passando", "Presença por camada · Marketplace", "Divergências", "Em linguagem de negócio", "Resultado esperado", "Garantida por testes em", "Onde a regra está", "Últimas 14 execuções", "Cenários".
- Estados: "Passando · 4/4", "Falhando · 3/4", "Sem cobertura", "Sem teste", "em correção", "Pendente".
- Metadados: "Sincronizado pelo CI", "há 12 min", "última execução no CI", "alterada há 2 dias em 4e1a90b", "Presente em: Flutter, TypeScript".

---

## 5. Pontos do design a confirmar

Itens encontrados ao analisar o canvas. Cada um tem uma decisão registrada em [adr/README.md](../adr/README.md).

1. **Nome.** O wordmark do design é `R/ ruleset` e o título do canvas é "Ruleset — visualizador de regras de negócio". O produto se chama **Behavior Viewer**. Ver ADR-0010.
2. **Texto solto no artboard "Visão geral".** O rodapé do `Main` contém texto sem relação com a interface (notas de testes de performance e uma instrução de deploy). Não foi especificado. Recomenda-se remover do canvas.
3. **Lista de funcionalidades incompleta.** O cabeçalho do catálogo diz "18 funcionalidades", mas a sidebar lista 9. Implementação: listar todas com rolagem (RF-27).
4. **"Copiar .feature para o app".** Interpretado como copiar o Gherkin para a área de transferência. Ver ADR-0007.
5. **Tecla de apresentação.** O design não define teclado. Setas e Esc foram propostas. Ver ADR-0008.
6. **Tema.** Somente escuro no design. Ver ADR-0009.
7. **Origem da sincronização.** A sidebar diz "Sincronizado pelo CI". No MVP a origem é a varredura local do workspace e dos relatórios. O texto do design será trocado por "Sincronizado há X" quando a origem for local. Revisar junto com ADR-0002.
8. **Fontes externas.** O canvas carrega Inter e JetBrains Mono do Google Fonts. A aplicação empacota as mesmas fontes (RNF-04).

---

## 6. Verificação de fidelidade

- Os quatro artboards são a referência de regressão visual. Capturas de cada tela no viewport de 1440 px são comparadas em CI com tolerância definida em `tests/visual/`.
- Cada token deste documento é usado via variável CSS (`--bg`, `--text-muted`, ...). Nenhum valor hexadecimal é escrito diretamente em componente.
- Nova tela ou componente só entra no código após ter entrada neste documento.

---

## 7. Desvios conscientes do canvas

Itens em que a implementação diverge do canvas, com a decisão que motivou cada um:

| Tela | Canvas | Implementado | Motivo |
|---|---|---|---|
| Sidebar | Wordmark `ruleset` | `Behavior Viewer`, com a marca `R/` mantida | ADR-0010 |
| Sidebar | "Sincronizado pelo CI · há 12 min" | "Sincronizado há X" + botão "Sincronizar" | Origem local no MVP, ADR-0002 |
| Visão geral | KPI "Passando" com "última execução no CI" | "relatórios há X" | Origem local dos relatórios |
| Catálogo | Menu "Status: todos" | Seletor nativo com as mesmas opções | Acessibilidade nativa, sem componente customizado |
| Catálogo | Lista de funcionalidades | Lista completa, com "Ver todas" quando há filtro | RF-27, desvio 3 de §5 |
| Detalhe | Botão "Copiar .feature para o app" | "Copiar Gherkin" | ADR-0007 |
| Detalhe | Cenários com execuções por linguagem no cabeçalho | Resultado do cenário na sua própria stack | Nomes de cenário diferem entre linguagens |
| Apresentação | Cartões de situação e resultado sempre visíveis | Cartão oculto quando não há texto | ADR-0006, "sem dados = cartão oculto" |
| Apresentação | Sem teclado especificado | ← → , Home, End e Esc | ADR-0008 |
| Todas | Fontes do Google Fonts | Inter e JetBrains Mono empacotadas | RNF-04, funcionamento offline |

Itens que permanecem como no canvas: tokens de cor, tipografia, raios, alturas, estrutura de cada tela e textos de referência (§4).

Regressão visual automatizada dos quatro artboards (§6) ainda não está implementada. A conferência foi feita por captura de tela manual em 1440 px.
