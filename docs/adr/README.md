# Registro de decisões de arquitetura (ADR)

Cada decisão importante fica registrada aqui, com contexto, escolha e consequências. Status possíveis:

- **Aceita:** decidida e em vigor.
- **Proposta:** recomendação do time, aguardando confirmação.
- **A confirmar:** depende de uma escolha de quem mantém o projeto. A recomendação está descrita, mas não deve ser implementada até a confirmação.
- **Substituída:** trocada por outra ADR (indicada no texto).

---

## Índice

| ADR | Título | Status |
|---|---|---|
| [0001](#adr-0001-typescript-em-todo-o-projeto) | TypeScript em todo o projeto | Aceita |
| [0002](#adr-0002-local-first-em-um-único-contêiner-com-sqlite) | Local-first em um único contêiner com SQLite | Aceita |
| [0003](#adr-0003-parser-oficial-do-cucumber-para-gherkin) | Parser oficial do Cucumber para Gherkin | Aceita |
| [0004](#adr-0004-workspace-montado-somente-leitura) | Workspace montado somente leitura | Aceita |
| [0005](#adr-0005-identificador-de-regra-por-tag-rn) | Identificador de regra por tag `@RN-` | Aceita |
| [0006](#adr-0006-situação-e-resultado-esperado-na-apresentação) | "Situação" e "Resultado esperado" na apresentação | Aceita |
| [0007](#adr-0007-significado-de-copiar-feature-para-o-app) | Significado de "Copiar .feature para o app" | Aceita |
| [0008](#adr-0008-navegação-por-teclado-no-modo-apresentação) | Navegação por teclado no modo apresentação | Aceita |
| [0009](#adr-0009-tema-somente-escuro) | Tema somente escuro | Aceita |
| [0010](#adr-0010-nome-do-produto) | Nome do produto | Aceita |
| [0011](#adr-0011-primitivas-de-acessibilidade) | Primitivas de acessibilidade | Proposta |
| [0012](#adr-0012-licença-mit) | Licença MIT | Aceita |
| [0013](#adr-0013-idioma-da-documentação) | Idioma da documentação | Proposta |

---

## ADR-0001: TypeScript em todo o projeto

**Status:** Aceita

**Contexto.** O produto tem servidor, domínio compartilhado e interface. Precisa de um parser Gherkin e de regras de status consistentes entre quem calcula e quem mostra.

**Decisão.** TypeScript em modo estrito em todos os pacotes. Monorepo com npm workspaces.

**Consequências.** Um só idioma para manter. `packages/domain` é testado sem I/O e reutilizado pela API e pela SPA. Exige disciplina de tipos nas fronteiras (validação com Zod na API).

---

## ADR-0002: Local-first em um único contêiner com SQLite

**Status:** Aceita

**Contexto.** O app deve rodar na máquina do usuário com um comando (RNF-02) e funcionar em macOS, Windows e Linux (RNF-01). Precisa guardar histórico de execuções (RF-20).

**Decisão.** Um contêiner que contém API, scanner e SPA estática. Armazenamento em SQLite em volume Docker. Nenhum serviço auxiliar.

**Consequências.** Instalação simples e sem dependências externas. Não escala para várias pessoas no mesmo servidor. Se for necessário modo multiusuário, será uma nova ADR (com banco externo e autenticação).

---

## ADR-0003: Parser oficial do Cucumber para Gherkin

**Status:** Aceita

**Contexto.** Gherkin tem idiomas, `Rule`, `Scenario Outline` e docstrings. Parser próprio tende a quebrar nesses casos.

**Decisão.** Usar `@cucumber/gherkin` e `@cucumber/messages`.

**Consequências.** Compatibilidade com o que o próprio Cucumber produz. Erros de parsing já trazem linha, o que atende RF-12.

---

## ADR-0004: Workspace montado somente leitura

**Status:** Aceita

**Contexto.** O app analisa código de terceiros (os projetos do usuário). Não deve alterar nada.

**Decisão.** O mount do workspace é `:ro`. Toda escrita vai para o volume de dados.

**Consequências.** A ferramenta não consegue, por construção, editar `.feature` (isso está fora do escopo, ver requisitos §4). Rotinas que precisem gravar algo no projeto devem ser feitas fora do app.

---

## ADR-0005: Identificador de regra por tag `@RN-`

**Status:** Aceita

**Contexto.** O design mostra IDs como `RN-CHK-004` e `RN-CUP-003`, e o mesmo ID aparece em todas as stacks para consolidar a regra. Gherkin não tem um campo de ID nativo para `Rule:`. Para identificar a regra entre Flutter, TypeScript e Java, é preciso um marcador comum.

**Opções:**

1. **Tag no bloco `Rule:`:** `@RN-CUP-003` logo acima de `Rule: ...`. Padrão do Gherkin, aparece em qualquer parser, não polui o título. *(recomendada)*
2. **Prefixo no título:** `Rule: RN-CUP-003 - Cupom não se soma...`. Visível, mas polui o texto de negócio e é frágil.
3. **Sem ID:** consolidar só por título normalizado (RF-14). Frágil a qualquer mudança de redação.

**Recomendação.** Opção 1, com fallback para a opção 3 quando não houver tag (RF-09 e RF-14).

**Decisão necessária.** Confirmar o formato `@RN-<SIGLA>-<NNN>` e a sigla de cada funcionalidade (`CUP` para cupons, `CHK` para checkout etc.).

---

## ADR-0006: "Situação" e "Resultado esperado" na apresentação

**Status:** Aceita

**Contexto.** A tela de apresentação mostra, para cada regra, a situação (Given) e o resultado esperado (Then) em linguagem de negócio. A regra no Gherkin é descrita em texto livre no bloco `Rule:`, mas nem sempre há um cenário "representativo".

**Opções:**

1. **Primeiro cenário da regra:** Given e Then do primeiro cenário. Automático, mas o texto pode ser técnico.
2. **Campos dedicados em comentário ou tag:** exemplo `# situacao: ...` e `# resultado: ...`. Controle total, mais trabalho para quem escreve.
3. **Ocultar os cartões quando não houver texto dedicado.** Simples, mas perde o conteúdo do design.

**Recomendação.** Opção 1 como padrão, e a opção 2 como override opcional. Ambas com a regra do ADR-0007 de "sem dados = cartão oculto".

---

## ADR-0007: Significado de "Copiar .feature para o app"

**Status:** Aceita

**Contexto.** Na tela de detalhe, quando uma regra não tem cobertura em uma stack, o design mostra o botão "Copiar .feature para o app". O texto não diz se a intenção é copiar o Gherkin da regra para colar na outra stack ou gerar um arquivo de teste na outra stack.

**Opções:**

1. **Copiar o Gherkin para a área de transferência.** Simples, sem escrita no projeto (ADR-0004). *(recomendada)*
2. **Gerar um arquivo `.feature` para download** com o texto da regra. Também sem escrita no projeto.
3. **Gerar o código de steps da stack de destino.** Fora do escopo do MVP: exige conhecer cada framework.

**Recomendação.** Opção 1 no MVP. Renomear o botão para "Copiar Gherkin" se a opção 1 for aprovada.

---

## ADR-0008: Navegação por teclado no modo apresentação

**Status:** Aceita

**Contexto.** O design não especifica teclado para a apresentação. Um modo apresentação sem teclado é desconfortável em projeção.

**Decisão proposta.** `←` e `→` para regra anterior e próxima, `Esc` para sair, `Home` e `End` para primeira e última. Atalhos visíveis em um tooltip discreto.

**Confirmar:** se os atalhos entram no MVP (RF-45 está como Should).

---

## ADR-0009: Tema somente escuro

**Status:** Aceita

**Contexto.** Os quatro artboards usam fundo `#0A0A0A`. Nenhum tema claro foi desenhado.

**Decisão proposta.** MVP somente escuro. Tokens organizados em variáveis CSS para permitir um tema claro no futuro sem reescrever componentes.

**Confirmar:** se um tema claro é necessário já no MVP. Se sim, é preciso um artboard de referência.

---

## ADR-0010: Nome do produto

**Status:** Aceita

**Contexto.** Três nomes aparecem nos materiais:

- O pedido inicial diz **Behavior Viewer**.
- O canvas de design se chama **"Ruleset — visualizador de regras de negócio"**, com wordmark `R/ ruleset`.
- A pasta do projeto é `behavior-viewer`.

**Decisão proposta.** Usar **Behavior Viewer** em toda a documentação e na interface, como pedido. Manter o logo do design (`R/`) como marca gráfica até que um novo logo seja definido, e trocar o texto "ruleset" do wordmark pelo nome do produto.

**Confirmar:**

1. O nome é "Behavior Viewer" mesmo, ou "Behavior Viewer" (o nome da pasta sugere isso)?
2. O wordmark do design deve trazer o nome do produto ou continuar como "ruleset"?

---

## ADR-0011: Primitivas de acessibilidade

**Status:** Proposta

**Contexto.** RNF-08 exige WCAG 2.1 AA, incluindo comportamento de menus, controles segmentados e diálogos. Implementar isso do zero é trabalhoso e propenso a erro.

**Proposta.** Usar primitivas sem estilo (Radix UI ou React Aria) para componentes interativos complexos, mantendo o visual deste design via CSS Modules. Botões e links simples continuam HTML puro.

**Consequências.** Mais uma dependência. Ganho em foco, teclado e ARIA. O estilo continua sob controle do projeto.

---

## ADR-0012: Licença MIT

**Status:** Aceita

**Contexto.** O projeto é open source (RNF-16). Precisa de uma licença permissiva e conhecida.

**Proposta.** MIT, com titular "The Behavior Viewer contributors" para não expor dados pessoais no arquivo de licença.

**Confirmar:** o nome do titular (pessoa ou organização) se preferir atribuir o copyright a alguém.

---

## ADR-0013: Idioma da documentação

**Status:** Proposta

**Contexto.** A interface e o design são em pt-BR. O projeto é open source e pode receber contribuições de outros países.

**Proposta.** Documentação e interface em pt-BR no MVP (RNF-10). Mensagens isoladas em arquivos de tradução para permitir inglês depois. README em inglês como segunda versão (`README.en.md`) quando houver contribuidores de fora.
