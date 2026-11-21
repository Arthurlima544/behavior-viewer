# Behavior Viewer

Visualizador open source de **regras de negócio** extraídas de testes BDD (Gherkin, `.feature`). Lê os arquivos dos seus projetos e mostra cada regra de forma clara: em que projeto ela existe, em quais stacks está testada, qual o status da última execução e onde há divergência entre Flutter, TypeScript e Java.

> **Status:** em planejamento. A documentação de requisitos, design e arquitetura está pronta. O código começa pela Fase 0 do [roadmap](docs/roadmap.md).

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

> Disponível a partir da versão 1.0. Até lá, o fluxo abaixo é o alvo do projeto.

Pré-requisitos: Docker Desktop (macOS e Windows) ou Docker Engine com o plugin Compose (Linux).

1. Crie um `docker-compose.yml` (ou use o da raiz do repositório) e aponte a pasta onde estão seus projetos:

   ```yaml
   services:
     behavior-viewer:
       image: ghcr.io/<org>/behavior-viewer:latest
       ports:
         - "127.0.0.1:8787:8787"
       environment:
         BEHAVIOR_WORKSPACE: /workspace
       volumes:
         - ~/code:/workspace:ro
         - behavior-data:/data
       restart: unless-stopped

   volumes:
     behavior-data:
   ```

2. Suba o serviço:

   ```bash
   docker compose up -d
   ```

3. Abra **http://localhost:8787** no navegador.

**Windows:** mantenha os projetos dentro do WSL2 ou em um drive compartilhado no Docker Desktop. Ver as [notas por sistema operacional](docs/arquitetura.md#83-notas-por-sistema-operacional).

---

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `BEHAVIOR_WORKSPACE` | `/workspace` | Uma ou mais pastas raiz, separadas por vírgula. |
| `BEHAVIOR_PORT` | `8787` | Porta interna do servidor. |
| `BEHAVIOR_SCAN_INTERVAL` | `60` | Intervalo de varredura em segundos. |
| `BEHAVIOR_LOG_LEVEL` | `info` | `debug`, `info`, `warn` ou `error`. |

Cada projeto pode declarar nome, stacks e relatórios em um arquivo `.behavior.yml` na própria raiz. Sem o arquivo, a detecção é automática. Exemplo em [docs/arquitetura.md §4.2](docs/arquitetura.md#42-arquivo-behavioryml-rf-05).

---

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
