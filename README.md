# Behavior Viewer

Visualizador open source de **regras de negócio** extraídas de testes BDD (Gherkin, `.feature`). Lê os arquivos dos seus projetos e mostra cada regra de forma clara: em que projeto ela existe, em quais stacks está testada, qual o status da última execução e onde há divergência entre Flutter, TypeScript e Java.

> **Status:** primeira versão funcional em desenvolvimento local. Descoberta de projetos, parser Gherkin, API, interface fiel ao design, modo apresentação e imagem Docker estão implementados e testados. Ver o [roadmap](docs/roadmap.md) para o que falta antes da 1.0.

---

## Por que existe

Regras de negócio ficam espalhadas em arquivos Gherkin, em várias linguagens e repositórios. Ninguém consegue responder de uma vez:

- Quais regras existem neste projeto?
- Uma regra está testada em todas as stacks ou só em uma?
- Quais testes estão falhando, em qual funcionalidade?

O Behavior Viewer responde essas perguntas com uma interface bonita e navegável, pensada para desenvolvedores, QAs e produto.

## O que faz

- **Descobre projetos** automaticamente em pastas que você indicar, ou você seleciona manualmente.
- **Agrupa stacks por projeto.** Um projeto pode ter Flutter, TypeScript, Java e outras stacks ao mesmo tempo.
- **Mostra regras, não só cenários.** Uma regra (`Rule:` com tag `@RN-…`) é uma só, mesmo implementada em várias stacks.
- **Mostra a cobertura** por funcionalidade e por stack, com matriz e painel de divergências.
- **Mostra o status** de cada regra por stack, vindo dos relatórios de execução (Cucumber JSON, JUnit XML).
- **Modo apresentação** para percorrer as regras de uma funcionalidade em tela cheia.
- **Roda local, em Docker**, em macOS, Windows e Linux. Somente leitura sobre seus projetos.

Design de referência (canvas): [visão geral, catálogo, detalhe e modo apresentação](docs/design/README.md).

---

## Início rápido

Pré-requisitos: Docker Desktop (macOS e Windows) ou Docker Engine com o plugin Compose (Linux).

```bash
# Aponte para a pasta onde estão seus projetos (somente leitura)
BEHAVIOR_HOST_WORKSPACE=~/code docker compose up --build
```

Abra **http://localhost:8787**. Sem a variável, o compose usa a pasta `fixtures/` do repositório como exemplo.

Para várias pastas, monte cada uma em `/workspace/<nome>` no `docker-compose.yml` e liste todas em `BEHAVIOR_WORKSPACE`, separadas por vírgula.

**Windows:** mantenha os projetos dentro do WSL2 ou em um drive compartilhado no Docker Desktop. Ver as [notas por sistema operacional](docs/arquitetura.md#83-notas-por-sistema-operacional).

### Desenvolvimento

Pré-requisitos: Node.js 22 LTS e npm 10 ou superior.

```bash
npm ci
npm run dev          # API em :8787 e interface em :5173 (recarga automática)
npm test             # testes unitários e de API
npm run test:e2e     # navegador real (Playwright), sobre as fixtures
npm run lint && npm run typecheck
```

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `BEHAVIOR_WORKSPACE` | `/workspace` | Uma ou mais pastas raiz, separadas por vírgula. |
| `BEHAVIOR_PORT` | `8787` | Porta do servidor. |
| `BEHAVIOR_HOST` | `127.0.0.1` | Endereço de escuta. No contêiner é `0.0.0.0`, e o compose publica só em `127.0.0.1`. |
| `BEHAVIOR_SCAN_INTERVAL` | `60` | Intervalo da varredura automática em segundos. `0` desativa. |
| `BEHAVIOR_DATA_DIR` | `./data` | Onde fica o banco SQLite com seleção de projetos e histórico. |
| `BEHAVIOR_LOG_LEVEL` | `info` | `debug`, `info`, `warn` ou `error`. |

Cada projeto pode declarar nome, descrição, stacks e relatórios em um arquivo `.behavior.yml` na própria raiz. Sem o arquivo, a detecção é automática. Exemplo em [docs/arquitetura.md §4.2](docs/arquitetura.md#42-arquivo-behavioryml-rf-05).

## Como escrever regras reconhecidas

O Behavior Viewer identifica a regra pelo bloco `Rule:` com uma tag de ID:

```gherkin
# language: pt
Funcionalidade: Cupons de desconto

  @RN-CUP-003
  Regra: Cupom não pode ser combinado com outra promoção
    Se um produto já está com desconto promocional, o cupom não se soma a ele.

    Cenário: Produto em promoção com cupom aplicado
      Dado que o carrinho contém "Tênis Run" com 20% de desconto promocional
      Quando o cliente aplicar o cupom "BEMVINDO10"
      Então o cupom deve ser recusado
```

Para que a mesma regra seja consolidada entre stacks, use **o mesmo ID** em todas elas. Regras sem ID continuam aparecendo, mas são consolidadas só pelo título e marcadas com aviso.

---

## Stacks suportadas

| Stack | Detecção | Relatórios |
|---|---|---|
| Flutter / Dart | `pubspec.yaml` | JUnit XML |
| TypeScript / JavaScript | `package.json` com Cucumber ou Playwright | Cucumber JSON |
| Java | `pom.xml` ou `build.gradle` com Cucumber | Cucumber JSON, JUnit XML |
| Outras Gherkin | — (aparece como "Gherkin genérico") | — |

Mais linguagens estão no [backlog](docs/roadmap.md#pós-mvp-backlog).

---

## Plataformas

| Sistema | Requisito |
|---|---|
| macOS (Intel e Apple Silicon) | Docker Desktop |
| Windows 10/11 | Docker Desktop com backend WSL2 |
| Linux (x86_64 e arm64) | Docker Engine e plugin Compose |

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [Requisitos](docs/requisitos.md) | Requisitos funcionais, não funcionais, glossário e escopo |
| [Design](docs/design/README.md) | Tokens, telas, componentes e pontos do design a confirmar |
| [Arquitetura](docs/arquitetura.md) | Componentes, modelo de domínio, API, persistência e Docker |
| [Tech stack](docs/tech-stack.md) | Tecnologias escolhidas e justificativas |
| [Decisões (ADR)](docs/adr/README.md) | Decisões tomadas e pendentes |
| [Roadmap](docs/roadmap.md) | Fases, critérios de saída e backlog |
| [Contribuição](CONTRIBUTING.md) | Como participar do projeto |

---

## Contribuir

Contribuições são bem-vindas: relatos de bug, sugestões, documentação, novas stacks e código. Leia o [guia de contribuição](CONTRIBUTING.md) antes de abrir um PR.

Para segurança, veja [SECURITY.md](SECURITY.md). Para convivência, veja o [código de conduta](CODE_OF_CONDUCT.md).

## Licença

Distribuído sob a licença [MIT](LICENSE).
