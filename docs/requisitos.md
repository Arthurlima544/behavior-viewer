# Requisitos — Behavior Viewer

Este documento é a fonte de verdade do **o que** o Behavior Viewer deve fazer. O **como** está em [arquitetura.md](arquitetura.md), a stack em [tech-stack.md](tech-stack.md), o visual em [design/README.md](design/README.md) e as decisões pendentes em [adr/](adr/).

Convenções:

- **Prioridade (MoSCoW):** `M` = Must (MVP), `S` = Should, `C` = Could, `W` = Won't (fora do escopo atual).
- Cada requisito tem um ID estável (`RF-` funcional, `RNF-` não funcional) e critérios de aceite verificáveis.
- Requisitos com **(a confirmar)** dependem de uma decisão listada em [adr/README.md](adr/README.md).

---

## 1. Visão

O Behavior Viewer é uma ferramenta open source, executada localmente em Docker, que lê os arquivos BDD (`.feature`) de um ou mais projetos e os apresenta como um catálogo visual de **regras de negócio**.

Problema que resolve: as regras de negócio ficam espalhadas em arquivos Gherkin de várias linguagens e repositórios. Ninguém consegue ver, de uma vez, quais regras existem, em quais stacks elas estão testadas e onde há divergência.

### 1.1 Princípios

1. **Foco por projeto e por funcionalidade.** O usuário navega por projeto → funcionalidade → regra.
2. **Regra é canônica; a implementação é por stack.** Uma regra é uma só, mesmo que esteja implementada em Flutter, TypeScript e Java. O sistema mostra onde ela existe e onde falta.
3. **Local e somente leitura.** Nunca altera os projetos analisados.
4. **Multiplataforma por Docker.** Mesmo comportamento em macOS, Windows e Linux.

### 1.2 Glossário

| Termo | Significado |
|---|---|
| **Projeto** | Um repositório ou pasta raiz que contém BDD. Pode ter várias stacks. |
| **Stack** | Uma implementação de BDD dentro de um projeto (ex.: Flutter, TypeScript, Java). |
| **Funcionalidade (Feature)** | Um arquivo `.feature` ou o bloco `Feature:` dele. |
| **Regra de negócio (Rule)** | Um bloco `Rule:` do Gherkin, identificado por uma tag de ID (ex.: `@RN-CUP-003`). É a unidade central do produto. |
| **Cenário (Scenario)** | Um `Scenario:` ou `Scenario Outline:` dentro de uma regra. |
| **Implementação** | A presença de uma regra em uma stack: arquivo, linha, steps e resultados. |
| **Divergência** | Uma regra presente em uma stack e ausente (ou sem cobertura) em outra. |
| **Execução** | Um resultado de teste ingerido de um relatório (Cucumber JSON ou JUnit XML). |

---

## 2. Requisitos funcionais

### 2.1 Descoberta e seleção de projetos

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-01 | Identificar projetos a partir de uma pasta escolhida pelo usuário (navegando ou digitando o caminho), identificando diretórios que contêm arquivos `.feature`. Nenhum projeto é pré-cadastrado. | M | Dado um workspace com 3 projetos com `.feature`, o scan lista os 3. Pastas sem `.feature` não aparecem. Pastas ignoradas por padrão (`node_modules`, `build`, `target`, `.git`, `.dart_tool`) são puladas. |
| RF-02 | Permitir selecionar manualmente quais projetos entram ou saem da visualização, pela UI e pelo arquivo de configuração. | M | Desmarcar um projeto na UI o remove da visão geral sem apagar dados. A seleção persiste entre reinícios. |
| RF-03 | Agrupar as stacks dentro de um projeto. Um projeto pode ter 1, 2, 3 ou mais stacks. | M | Um projeto com `app/` (Flutter), `web/` (TypeScript) e `api/` (Java) aparece como um único projeto com 3 stacks. |
| RF-04 | Identificar a stack pelos manifestos: `pubspec.yaml` (Flutter/Dart), `package.json` com Cucumber ou Playwright (TypeScript/JavaScript), `pom.xml` ou `build.gradle(.kts)` com Cucumber (Java). Stack não reconhecida vira "Gherkin genérico". | M | Cada fixture de exemplo em `fixtures/` é classificada na stack correta. |
| RF-05 | Permitir declarar projetos e stacks em `.behavior.yml` na raiz do projeto (nome, caminhos por stack, padrões de exclusão). A configuração tem precedência sobre a detecção automática. | M | Um `.behavior.yml` que define nome e stacks substitui o nome e a detecção automáticos. Erro de sintaxe no YAML é mostrado na UI com o arquivo e a linha, sem derrubar os outros projetos. |

### 2.2 Leitura do BDD

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-06 | Interpretar Gherkin: `Feature`, `Rule`, `Background`, `Scenario`, `Scenario Outline` com `Examples`, tags, descrição e comentários. | M | Cobertura de testes do parser com fixtures de cada palavra-chave. |
| RF-07 | Respeitar o cabeçalho `# language:` do Gherkin, incluindo `pt` (palavras-chave em português). | M | Um arquivo com `# language: pt` tem `Dado`, `Quando`, `Então` interpretados corretamente. |
| RF-08 | Identificar a regra pelo bloco `Rule:` que tenha uma tag de ID no formato `@RN-<SIGLA>-<NNN>`. | M | `@RN-CUP-003` vira o ID da regra `RN-CUP-003`. Ver ADR-0005 (a confirmar). |
| RF-09 | Quando um `Rule:` não tem tag de ID, gerar um ID provisório a partir do arquivo e do título, marcá-lo como "sem ID" e exibir um aviso. | M | A regra aparece no catálogo com badge "sem ID" e o aviso aparece na visão geral do projeto. |
| RF-10 | Quando o arquivo não tem nenhum `Rule:`, tratar cada `Scenario` como uma regra própria, marcada como "regra implícita". | S | Um `.feature` sem `Rule:` gera uma regra por cenário, com o aviso "regra implícita". |
| RF-11 | Extrair os campos de linguagem de negócio de cada regra: título, descrição (texto livre do bloco `Rule:`), "Situação" (Given) e "Resultado esperado" (Then) do cenário representativo. | M | Os campos alimentam a tela de detalhe e o modo apresentação. Ver ADR-0006 (a confirmar). |
| RF-12 | Tratar erros de parsing por arquivo: o arquivo inválido é marcado com erro, com caminho e linha, e os demais arquivos continuam sendo lidos. | M | Um `.feature` com erro de sintaxe gera um item na lista "Erros de leitura"; o resto do projeto continua visível. |

### 2.3 Regra canônica e cobertura entre stacks

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-13 | Consolidar regras pelo ID: a mesma regra em várias stacks vira uma única entrada com N implementações. | M | `RN-CHK-004` em Flutter, TypeScript e Java aparece uma vez no catálogo, com três implementações. |
| RF-14 | Quando o ID não existir, consolidar pelo título normalizado (minúsculas, sem acentos, sem pontuação) e sinalizar a consolidação como "por título". | S | Duas stacks com o mesmo título e sem ID geram uma regra "por título" com aviso. |
| RF-15 | Calcular a matriz de presença: para cada funcionalidade e stack, quantas regras estão cobertas sobre o total. | M | A matriz da visão geral mostra `5/7` quando uma stack tem 5 de 7 regras da funcionalidade. |
| RF-16 | Listar divergências: regras presentes em uma stack e ausentes em outra, e regras com cobertura parcial. | M | O painel "Divergências" lista as regras ausentes e linka para o detalhe. |

### 2.4 Resultados de testes

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-17 | Ler relatórios de execução Cucumber JSON e JUnit XML por stack, a partir de caminhos configurados ou de caminhos padrão (ex.: `target/cucumber.json`, `build/test-results/`). | M | Um `cucumber.json` gerado pelo cucumber-js é lido e associado aos cenários. |
| RF-18 | Associar cada cenário ao resultado usando arquivo + nome do cenário. Cenários sem resultado ficam como "sem execução". | M | Cenários sem entrada no relatório aparecem como "sem execução", não como "passando". |
| RF-19 | Calcular o status por regra e por stack: **passando**, **falhando**, **pendente** (steps indefinidos ou pendentes), **sem execução** e **sem cobertura** (a regra não existe na stack). | M | Uma regra com 1 cenário falho e 3 passando na stack Java fica "falhando · 3/4" na stack Java. |
| RF-20 | Persistir o histórico de execuções por stack (mínimo das últimas 14 execuções por cenário). | S | O detalhe da regra mostra a faixa "Últimas 14 execuções" com a cor de cada execução. |
| RF-21 | Registrar a data da última sincronização de cada projeto e o `ref` do repositório (branch e commit curto), quando disponível. | S | A visão geral mostra "há 12 min" e "main · a3f9c1e". |
| RF-22 | Aceitar envio de relatórios por API a partir do CI. | C | Fora do MVP. Ver roadmap, pós-MVP. |

### 2.5 Visão geral

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-23 | Mostrar indicadores globais: total de regras, funcionalidades, cenários e percentual passando, somados a partir dos projetos visíveis. | M | Os totais são iguais à soma dos projetos selecionados. |
| RF-24 | Mostrar um card por projeto com nome, descrição, stacks (ícone + rótulo), contadores (regras, funcionalidades, cenários), barra de status (passando, pendente, falhando) e rodapé com ref e sincronização. | M | O card é clicável e leva ao catálogo do projeto. |
| RF-25 | Mostrar a matriz de presença por camada do projeto em destaque, com o link "Abrir catálogo". | M | Células com lacuna usam a forma tracejada e o texto `x/y` (não somente cor). |
| RF-26 | Mostrar o painel "Divergências" com um resumo textual por funcionalidade e um link "Ver regras afetadas". | M | Os textos são gerados a partir da matriz, não digitados à mão. |

### 2.6 Catálogo de regras

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-27 | Mostrar a lista de funcionalidades do projeto na lateral, com a contagem de regras de cada uma, e destacar a funcionalidade ativa. | M | Todas as funcionalidades aparecem (não apenas um recorte, como ocorre no canvas). Ver [design/README.md §5](design/README.md#5-pontos-do-design-a-confirmar), item 3. |
| RF-28 | Agrupar as regras por funcionalidade, mostrando o arquivo (`checkout.feature`), o resumo (`18 regras · 17 passando · 1 pendente`) e a lista de regras. | M | Cada grupo tem cabeçalho com nome, arquivo e resumo. |
| RF-29 | Cada linha de regra mostra: indicador de status, ID, título, tags, badges de stack (ativo/inativo) e número de cenários. Clicar leva ao detalhe. | M | Badges inativos têm borda tracejada. |
| RF-30 | Filtrar por texto livre (título, ID ou `@tag`) com campo de busca. | M | Filtrar por `RN-CUP` mostra só regras cujo ID começa com `RN-CUP`. |
| RF-31 | Filtrar por stack com os botões "Todas", "Flutter", "TypeScript" e "Java". Filtro de stack mostra só regras presentes nela. | M | Selecionar "Java" mostra apenas regras com implementação Java. |
| RF-32 | Filtrar por status ("Status: todos" com menu) e por "Só divergentes". | M | "Só divergentes" mostra regras com ausência ou lacuna em alguma stack. |

### 2.7 Detalhe da regra

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-33 | Mostrar cabeçalho com trilha (Projeto / Funcionalidade / ID), ID, título, badges de status por stack, tags, feature de origem e autor/data da última alteração do arquivo (último commit, quando há git). | M | "Alterada há 2 dias em 4e1a90b" vem do `git log` do arquivo. Sem git, o campo é omitido. |
| RF-34 | Mostrar a descrição em linguagem de negócio da regra, com o caminho do arquivo de origem. | M | O texto vem do bloco `Rule:` (RF-11). |
| RF-35 | Listar os cenários da regra em dois modos: **Gherkin** (palavras-chave em destaque) e **Texto simples** (sem palavras-chave). | M | A alternância é um controle segmentado acessível (`aria-pressed`). |
| RF-36 | Paginar os cenários com o botão "Mostrar mais N cenários". | S | Por padrão são mostrados 2 cenários por página. |
| RF-37 | Mostrar "Onde a regra está": um cartão por stack com arquivo e linha, steps, runner (ex.: "Cucumber-JVM", "Playwright + Cucumber"), duração e última execução. | M | Cada cartão mostra o estado (passando, falhando, sem cobertura). |
| RF-38 | Para stacks sem cobertura, mostrar "Nenhum cenário com esta regra em `<pasta>`" e o botão "Copiar .feature para o app", que copia o Gherkin da regra para a área de transferência. | S | O botão copia o texto Gherkin completo da regra. Ver ADR-0007 (a confirmar). |
| RF-39 | Mostrar a faixa "Últimas 14 execuções" por stack, com cada execução em verde-claro (passou), vermelho (falhou) ou tracejada (sem execução). | S | Passar o mouse sobre uma célula mostra "Passou", "Falhou" ou "Sem execução". |
| RF-40 | Permitir copiar o link profundo da regra ("Copiar link"). | M | O link abre o detalhe da mesma regra em outro navegador. |
| RF-41 | Botão "Apresentar" leva ao modo apresentação da funcionalidade da regra. | M | Abre a apresentação já posicionada na regra. |

### 2.8 Modo apresentação

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-42 | Apresentar as regras de uma funcionalidade uma por tela, em tela cheia, com cabeçalho contendo projeto, funcionalidade e a posição `n de N`. | M | O título da tela é "Modo apresentação" para leitores de tela. |
| RF-43 | Mostrar para cada regra: rótulo `REGRA 01 · ID`, título grande, "Por que" (descrição), cartões "Situação" (Given) e "Resultado esperado" (Then), e "Garantida por testes em" com os estados Web/App/API. | M | Os três estados usam formas e texto distintos: ok (sólido), em correção (vermelho tracejado), sem teste (tracejado cinza). |
| RF-44 | Navegar com botões "Anterior" e "Próxima", com pontos clicáveis (o ponto ativo é mais largo) e barra de progresso no topo. | M | "Anterior" fica desabilitado na primeira regra e "Próxima" na última. |
| RF-45 | Navegar também pelo teclado: setas (← →) para anterior/próxima, Esc para sair. | S | Adicionado pelo time, não existe no design. Confirmar (ADR-0008). |
| RF-46 | Botão "Sair da apresentação" volta ao catálogo da funcionalidade. | M | Fecha a apresentação sem perder a posição do catálogo. |

### 2.9 Busca e navegação

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-47 | Busca global com atalho `⌘K` no macOS e `Ctrl+K` no Windows e Linux. Busca por ID, título e tag em todos os projetos visíveis. | M | O atalho exibido na interface corresponde ao sistema operacional detectado. |
| RF-48 | Rotas acessíveis por URL: visão geral, catálogo de um projeto, detalhe de uma regra e apresentação de uma funcionalidade. | M | Recarregar a página mantém a tela aberta. |
| RF-49 | Navegação por trilha (breadcrumb) em catálogo, detalhe e apresentação. | M | Cada item da trilha é um link. |

### 2.10 Atualização e configuração

| ID | Requisito | Prio | Critérios de aceite |
|---|---|---|---|
| RF-50 | Permitir reexecutar a varredura sob demanda ("Sincronizar") e periodicamente (intervalo configurável, padrão 60 s). | M | Após criar um `.feature`, o novo cenário aparece sem reiniciar o container. |
| RF-51 | Configuração global por variáveis de ambiente e arquivo: caminhos raiz do workspace, porta, intervalo de varredura e caminhos de relatórios. | M | Todas as opções têm valor padrão e estão documentadas em `docs/` e no `docker-compose.yml`. |
| RF-52 | Estado vazio: sem projetos, sem regras ou sem resultados têm mensagens claras com o próximo passo ("Adicionar projeto"). | M | Nenhuma tela fica em branco sem explicação. |
| RF-53 | Exportar as regras de um projeto em JSON. | C | Fora do MVP. |

---

## 3. Requisitos não funcionais

| ID | Categoria | Requisito | Critério de verificação |
|---|---|---|---|
| RNF-01 | Plataforma | Executar em macOS (Intel e Apple Silicon), Windows 10/11 (Docker Desktop com WSL2) e Linux (x86_64 e arm64). | Teste manual documentado em cada plataforma antes de cada release. |
| RNF-02 | Distribuição | Rodar com um comando: `docker compose up`. Imagem publicada para `linux/amd64` e `linux/arm64`. | Pipeline de CI constrói as duas arquiteturas. |
| RNF-03 | Segurança de dados | O workspace é montado somente leitura. O app só escreve no volume de dados. | `docker inspect` mostra o mount do workspace com `ro`. |
| RNF-04 | Privacidade | Sem chamadas de rede externas em tempo de execução. Fontes e ícones são locais. Sem telemetria por padrão. | Teste de integração com rede bloqueada carrega todas as telas. |
| RNF-05 | Segurança de rede | A porta é publicada somente em `127.0.0.1` por padrão. | `docker-compose.yml` usa `127.0.0.1:<porta>:<porta>`. |
| RNF-06 | Desempenho | Scan de 500 arquivos `.feature` e 5.000 cenários em menos de 10 s. Catálogo com 2.000 regras renderiza em menos de 1 s. | Benchmark com fixture gerada. Acima de 2.000 regras, virtualizar a lista. |
| RNF-07 | Fidelidade visual | A interface segue o design de referência: tokens, tipografia, espaçamentos e estados descritos em [design/README.md](design/README.md). | Teste de regressão visual contra os quatro artboards (ver arquitetura, seção de testes). |
| RNF-08 | Acessibilidade | WCAG 2.1 AA: contraste de texto 4,5:1 e de elementos gráficos 3:1, alvos de toque de 44 px, foco visível, navegação por teclado e rótulos ARIA em botões só com ícone. Status nunca é indicado só por cor. | Auditoria automática (axe) sem violações graves em cada tela. |
| RNF-09 | Responsividade | Os layouts reorganizam em telas estreitas (linhas quebram, colunas empilham). Tabelas largas rolam horizontalmente dentro de caixa própria. | Verificação em 390 px, 768 px e 1440 px. |
| RNF-10 | Idioma | Interface em pt-BR. Textos centralizados para permitir i18n futuro. | Nenhum texto de interface fixo fora do arquivo de mensagens. |
| RNF-11 | Segurança de conteúdo | O conteúdo dos `.feature` é tratado como texto. Nada é executado nem interpretado como HTML. Cabeçalhos de segurança (CSP) ativos. | Teste com cenário contendo `<script>` mostra o texto literal. |
| RNF-12 | Manutenibilidade | TypeScript em modo estrito. Parser e domínio com cobertura de testes de no mínimo 80%. | Gate de cobertura no CI. |
| RNF-13 | Observabilidade | Logs estruturados em JSON, endpoint `GET /api/v1/health`, e tempo de scan registrado no log. | `health` retorna 200 com versão e estado do último scan. |
| RNF-14 | Dados | Histórico em SQLite dentro do volume de dados. Nada é perdido ao reiniciar o container. Cache de índice pode ser reconstruído a partir dos arquivos. | Reiniciar o container mantém o histórico de execuções. |
| RNF-15 | Versionamento | SemVer. Imagens com tag de versão e `latest`. Changelog por release. | Tags Git `vX.Y.Z` geram imagens. |
| RNF-16 | Open source | Licença MIT, guia de contribuição, código de conduta, política de segurança e issues com modelos. | Arquivos presentes na raiz do repositório. |
| RNF-17 | Inicialização | O container fica pronto em menos de 15 s em uma máquina de referência (4 vCPU, 8 GB RAM). | Medido no CI com a imagem de release. |

---

## 4. Fora do escopo (MVP)

- Edição de arquivos `.feature` pela ferramenta (o app é somente leitura).
- Execução de testes pela interface.
- Autenticação e múltiplos usuários. O app é local e de uso individual.
- Tema claro. O design de referência é somente escuro (ADR-0009, a confirmar).
- Hospedagem em nuvem.

## 5. Premissas

- O usuário tem Docker instalado (Docker Desktop no macOS e no Windows, Docker Engine no Linux).
- Os projetos já são executados localmente pelo time. O Behavior Viewer não precisa das ferramentas de build de cada stack.
- Os relatórios de execução são gerados pelo próprio projeto ou pelo CI e ficam acessíveis no workspace.
- Os arquivos `.feature` estão em UTF-8.
