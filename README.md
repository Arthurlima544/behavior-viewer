# Behavior Viewer

Visualizador open source de **regras de negócio** extraídas de testes BDD (Gherkin, arquivos `.feature`).

Ele lê os testes dos seus projetos e mostra, de forma navegável, quais regras existem, em quais linguagens (Flutter, TypeScript, Java) cada regra está testada, qual o resultado da última execução, em qual tela ela se aplica e como ficou cada cenário com a captura de tela tirada durante o teste.

Roda na sua máquina, em Docker, e funciona em macOS, Windows e Linux. Ele só lê seus arquivos: nunca os altera.

> Estado: primeira versão funcional (0.1.0). Veja o [roadmap](docs/roadmap.md) e o [changelog](CHANGELOG.md).

---

## O que ele faz

- **Registra projetos** escolhendo uma pasta pela própria interface ou digitando o caminho. Um projeto pode ter várias stacks: ele detecta Flutter, TypeScript e Java e agrupa tudo no mesmo projeto.
- **Identifica funcionalidades e testes:** cada `Funcionalidade:` (ou `Feature:`) vira uma funcionalidade, e cada `Regra:` com uma tag `@RN-…` vira uma regra de negócio. Os mesmos nomes em stacks diferentes são agrupados.
- **Mostra cobertura:** uma matriz por funcionalidade e stack, e a lista de divergências, isto é, regras presentes em uma linguagem e ausentes em outra.
- **Mostra resultados:** lê os relatórios de execução (Cucumber JSON ou JUnit XML) e mostra o status de cada cenário e as últimas 14 execuções de cada regra.
- **Mostra telas e capturas:** liga cada regra à tela e aos componentes declarados, e exibe as capturas de tela tiradas durante os testes, ao lado de cada cenário.
- **Avisa sobre mudanças:** detecta alterações nas pastas de teste e pede para você sincronizar. Marca regras e cenários **novos** ou **alterados** desde a última vez que você viu o projeto.
- **Apresenta** cenário a cenário, em tela cheia, com as setas do teclado, para revisar regras com a equipe.

## Como começar

Veja o [guia de instalação](docs/instalacao.md). Em resumo, com Docker instalado:

```bash
docker compose up --build
```

Abra **http://localhost:8787**, clique em **Adicionar projeto** e escolha a pasta de um projeto com testes BDD.

## Como o projeto funciona

| Conceito | Como o Behavior Viewer entende |
|---|---|
| Projeto | Uma pasta registrada. Ela pode conter uma ou mais stacks. |
| Stack | Flutter, TypeScript ou Java, detectada pelo arquivo de manifesto (`pubspec.yaml`, `package.json`, `pom.xml`). |
| Funcionalidade | O nome do bloco `Funcionalidade:` / `Feature:`. Mesmo nome, mesma funcionalidade. |
| Regra | Um bloco `Regra:` com a tag de ID `@RN-<SIGLA>-<NNN>`. Sem a tag, a regra aparece como provisória. |
| Cenário | Um `Cenário:` dentro da regra. |
| Tela e componente | Tags `@tela-<Nome>` e `@componente-<Nome>`, ou a seção `telas` do `.behavior.yml`. |
| Captura | Imagem tirada durante a execução, listada em `reports/capturas/indice.json`. |
| Sincronizar | Reconstrói os projetos com o que está na pasta agora. Nunca acontece sozinho. |

### Convenções que fazem diferença

- **Tags com hífen:** use `@tela-CheckoutPage` e `@componente-FormularioEndereco`. Os dois-pontos (`@tela:X`) são aceitos, mas não funcionam em runners do Dart como `package:test`.
- **Títulos descritivos:** descreva o resultado para quem usa o app, e não os passos da tela. Exemplo: "Cupom expirado é recusado com mensagem clara".
- **Arquivos de terceiros fora da contagem:** exclua `vendor/`, `node_modules/` e `Pods/` com `ignorar` no `.behavior.yml`.
- **Relatórios para o status:** sem um relatório de execução, os cenários aparecem como "Sem execução". O Behavior Viewer não roda os testes; ele lê o que a sua suíte gera.

Os [prompts de preparação por stack](docs/prompts/README.md) mostram como adaptar um projeto para telas, rotas e capturas.

## Configuração

| Variável | Padrão | Para que serve |
|---|---|---|
| `BEHAVIOR_BROWSE_ROOTS` | pasta pessoal | Pastas que a interface pode navegar e registrar, separadas por vírgula. |
| `BEHAVIOR_BROWSE_LABEL` | `~` | Como a raiz aparece nos caminhos da interface. |
| `BEHAVIOR_PORT` | `8787` | Porta do servidor. |
| `BEHAVIOR_HOST` | `127.0.0.1` | Endereço de escuta. No contêiner é `0.0.0.0`. |
| `BEHAVIOR_SCAN_INTERVAL` | `60` | Segundos entre as detecções de mudança. `0` desativa. |
| `BEHAVIOR_DATA_DIR` | `./data` | Onde fica o banco local (registros, histórico e linhas de base). |
| `BEHAVIOR_LOG_LEVEL` | `info` | `debug`, `info`, `warn` ou `error`. |

No Docker, `HOST_HOME` escolhe a pasta montada (padrão: sua pasta pessoal) e `HOST_UID`/`HOST_GID` definem o usuário do contêiner. Veja o [guia de instalação](docs/instalacao.md).

## Segurança e privacidade

- **Somente leitura:** a pasta de projetos é montada como leitura. O Behavior Viewer não escreve nos seus arquivos.
- **Só localhost:** a porta é publicada apenas em `127.0.0.1`.
- **Sem rede externa:** a interface carrega fontes e ícones do próprio servidor, e não há telemetria.
- **Caminhos validados:** a navegação e as capturas só alcançam o que está dentro das pastas permitidas. Links simbólicos e `..` que saem dessas pastas são recusados.

Para reportar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [Instalação](docs/instalacao.md) | Docker, desenvolvimento local, Windows, macOS, Linux e solução de problemas |
| [Contribuição](CONTRIBUTING.md) | Como participar, padrões de código, commits e revisão |
| [Requisitos](docs/requisitos.md) | O que o produto faz, com critérios de aceite |
| [Design](docs/design/README.md) | Tokens, telas e componentes |
| [Arquitetura](docs/arquitetura.md) | Componentes, modelo de dados, API e Docker |
| [Stack técnica](docs/tech-stack.md) | Tecnologias escolhidas e justificativas |
| [Decisões (ADR)](docs/adr/README.md) | Decisões tomadas e a justificativa de cada uma |
| [Prompts](docs/prompts/README.md) | Como preparar um projeto para telas, rotas e capturas |
| [Roadmap](docs/roadmap.md) | Fases e o que falta para a 1.0 |
| [Changelog](CHANGELOG.md) | O que mudou em cada versão |

## Licença

Distribuído sob a licença [MIT](LICENSE).
