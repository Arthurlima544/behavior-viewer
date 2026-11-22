# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] - não publicada

Primeira versão funcional.

### Adicionado

- **Projetos:** registro por pasta escolhida na interface ou digitada, com navegação limitada às pastas permitidas. Identificação automática de projetos, stacks (Flutter, TypeScript, Java) e funcionalidades a partir de uma pasta.
- **Leitura BDD:** parser Gherkin com `# language:`, `Regra:`, `Scenario Outline` e tags. Regras por tag `@RN-…`, com regras provisórias e implícitas quando não há tag.
- **Consolidação:** a mesma regra em várias stacks vira uma entrada. Matriz de presença por funcionalidade e stack, e lista de divergências.
- **Resultados:** leitura de Cucumber JSON e JUnit XML, com status por cenário e por regra, e histórico das últimas 14 execuções.
- **Telas e componentes:** tags `@tela-` e `@componente-` (também aceitas com dois-pontos), seção `telas` no `.behavior.yml`, e ligação de regras a telas por tag ou por rota citada em um passo.
- **Capturas de tela:** leitura de `reports/capturas/indice.json`, com imagens exibidas ao lado de cada cenário e no modo apresentação.
- **Catálogo:** filtros por texto, stack, status, divergências e novidades, com a filtragem na URL.
- **Detalhe da regra:** cenários com passos e capturas, faixa de stacks e botão para copiar o Gherkin.
- **Apresentação:** um cenário por slide, em tela cheia, com as setas do teclado. Apresenta a funcionalidade, todo o projeto ou só as novidades.
- **Novidades:** marcação de regras e cenários novos ou alterados desde a última visualização do projeto.
- **Detecção de mudanças:** detecção periódica de alterações nas pastas de teste (SHA-256), com alerta para sincronizar. A sincronização é sempre manual.
- **Instalação:** imagem Docker multi-arquitetura (amd64 e arm64), usuário sem privilégios, pasta do usuário montada em modo somente leitura.
- **Qualidade:** testes unitários, de API e E2E no Chromium, com auditoria de acessibilidade (axe) na visão geral.
