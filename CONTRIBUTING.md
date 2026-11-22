# Guia de contribuição

Obrigado por considerar contribuir com o Behavior Viewer. Este guia explica como reportar problemas, propor mudanças e enviar código.

Antes de começar, leia:

- [README](README.md): o que é o produto e como ele funciona.
- [Instalação](docs/instalacao.md): como rodar o projeto na sua máquina.
- [Requisitos](docs/requisitos.md) e [design](docs/design/README.md): o que o produto deve fazer e como deve parecer.
- [Arquitetura](docs/arquitetura.md) e [ADRs](docs/adr/README.md): como o código está organizado e por que as decisões foram tomadas. Uma decisão marcada como **A confirmar** não deve ser implementada sem alinhamento.

Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

---

## Formas de contribuir

| Tipo | Como |
|---|---|
| Relatar bug | Abra uma issue com o modelo **Bug**: sistema operacional, versão do Docker, passos para reproduzir e a saída de `docker compose logs`. |
| Sugerir funcionalidade | Abra uma issue com o modelo **Funcionalidade**. Relacione com um requisito de [requisitos.md](docs/requisitos.md) ou descreva o caso de uso. |
| Reportar regra mal interpretada | Abra uma issue com o modelo **Regra de negócio**: o ID da regra, um trecho do `.feature` (com nomes fictícios) e o que o app mostrou. |
| Melhorar a documentação | PR direto, alterando um tópico por vez. |
| Adicionar suporte a uma stack | Veja [Adicionar uma nova stack](#adicionar-uma-nova-stack). |
| Corrigir código ou design | Siga o fluxo de PR abaixo. |

Problemas de segurança **não** devem ser abertos como issue pública. Veja [SECURITY.md](SECURITY.md).

---

## Ambiente de desenvolvimento

Pré-requisitos: Node.js 22 LTS, npm 10 ou superior, Git. Para testar a imagem Docker, também o Docker com Compose v2.

```bash
git clone <url-do-repositorio>
cd behavior-viewer
npm ci
npm run dev          # API em :8787 e interface em :5173, com recarga
```

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API e a interface em modo de desenvolvimento |
| `npm test` | Testes unitários e de integração (domínio, servidor e interface) |
| `npm run test:e2e` | Testes no navegador (Chromium), com um servidor de teste na porta 8790 |
| `npm run lint` | ESLint em todo o repositório |
| `npm run typecheck` | `tsc --noEmit` em todos os pacotes |
| `npm run build` | Compila domínio, servidor e interface |
| `docker compose up --build` | Sobe a imagem como em produção |

Antes de abrir um PR, rode `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e`.

### Estrutura do repositório

```
packages/domain/     Regras puras: status, consolidação, matriz e divergências (sem I/O)
apps/server/         API, varredura, parser Gherkin, relatórios, persistência SQLite
apps/web/            Interface React (rotas, componentes e páginas)
tests/fixtures/      Projetos de exemplo usados pelos testes (não é dado do produto)
tests/e2e/           Testes no navegador
docs/                Documentação, ADRs, design e prompts
docker/              Dockerfile da imagem
```

### Projetos de exemplo

As fixtures em `tests/fixtures/` simulam projetos reais. Elas são usadas só pelos testes: o produto não traz projetos pré-cadastrados.

| Fixture | O que testa |
|---|---|
| `tests/fixtures/marketplace` | Três stacks (Flutter, TypeScript, Java), `.behavior.yml`, telas, tags, relatórios e capturas |
| `tests/fixtures/projeto-sem-config` | Detecção automática sem `.behavior.yml`, regras implícitas e erro de sintaxe |

Ao adicionar um teste de API ou E2E que precisa de um projeto, crie uma pasta temporária dentro de `tests/` e remova-a no fim do teste. Não coloque dados reais, nomes de pessoas ou caminhos da sua máquina em fixtures.

---

## Fluxo de contribuição

1. **Abra ou encontre uma issue.** Para mudanças grandes, alinhe antes para evitar retrabalho.
2. **Crie uma branch curta** a partir de `main`:
   - `feat/<descricao>`, `fix/<descricao>`, `docs/<descricao>`, `refactor/<descricao>`, `test/<descricao>`.
3. **Escreva o código e os testes** no mesmo PR. Mudança de comportamento sem teste não é aceita.
4. **Atualize a documentação** que a mudança afeta: requisito, design, arquitetura, ADR ou guia.
5. **Rode a checagem local** (veja os comandos acima).
6. **Abra o PR** usando o modelo e preencha o checklist.
7. **Revisão:** pelo menos uma aprovação, com o CI passando.
8. **Merge:** por squash, com o título do PR como mensagem do commit.

Mantenha os PRs pequenos. Um PR resolve um problema. Se a mudança passar de cerca de 400 linhas alteradas, divida.

---

## Mensagens de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
<tipo>(<escopo opcional>): <descrição no imperativo, em minúsculas>

<corpo opcional explicando o porquê>

<rodapé opcional, ex.: Refs: #123>
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

Mudanças que quebram compatibilidade usam `!` após o tipo ou `BREAKING CHANGE:` no rodapé.

Exemplos:

```
feat(parser): ler tags @componente- no bloco Regra
fix(status): tratar cenário sem resultado como sem execução
docs(instalacao): explicar HOST_UID no Linux
```

---

## Padrões de código

### Geral

- TypeScript em modo estrito. Evite `any`. Quando o formato vem de fora (AST do Gherkin, relatórios), isole a conversão na borda.
- Lógica de status, consolidação e matriz fica em `packages/domain`, sem I/O, e é testada sem subir o servidor.
- Erros esperados da API usam `ApiError` (código estável e status HTTP). Erros de leitura de um arquivo viram aviso, e não derrubam a varredura.
- Nenhum segredo, caminho pessoal ou dado real em código, fixture, log ou documentação.

### Interface

- **Nunca** escreva cor hexadecimal em componente. Use as variáveis definidas em [docs/design/README.md §2](docs/design/README.md#2-tokens).
- Um componente novo ganha entrada em [docs/design/README.md §3](docs/design/README.md#3-componentes) antes do código.
- Status nunca é indicado só por cor: use cor, forma e texto.
- Botões só com ícone têm `aria-label`. Use elementos semânticos (`button`, `a`, `input` com `label`).
- Caminhos de arquivo vindos da API são exibidos com a fonte mono e nunca são usados como endereço do disco no cliente.

### Servidor

- Caminhos vindos do cliente passam por `resolveAllowed` (absoluto, existente, dentro das raízes permitidas, com caminho real).
- Imagens de captura passam por `caminhoCapturaValido` e são servidas só de dentro da pasta do projeto.
- A detecção de mudanças (`hashesDaPasta`) e a varredura completa (`buildSnapshot`) usam as mesmas regras de descoberta e de `ignorar`. Mudar uma delas exige mudar as duas.

### Testes

- Parser, status, consolidação, matriz e marcação de novidades: **teste unitário**.
- Mudança em rota da API: **teste de API** com `fastify.inject`.
- Mudança de tela ou de fluxo do usuário: **teste E2E**. Use uma pasta temporária para dados que mudam durante o teste.
- Cobertura do domínio e do parser: mínimo de 80%.

---

## Adicionar uma nova stack

Uma stack é reconhecida por três partes:

1. **Detecção:** em `apps/server/src/scanner/manifests.ts`, a função `detectStackInDir` reconhece o manifesto da stack. Some a stack ao tipo `Stack` em `packages/domain/src/types.ts`.
2. **Relatórios:** se o formato de relatório for novo, implemente o leitor em `apps/server/src/parser/reports.ts`. Cucumber JSON e JUnit XML já são suportados.
3. **Fixture e teste:** crie um projeto mínimo em `tests/fixtures/` com `.feature` e relatório gerado de verdade, e um teste de detecção.

No PR, inclua também:
- a linha da stack em [docs/requisitos.md](docs/requisitos.md) e no [README](README.md);
- o logo da stack em `apps/web/public/stacks/`, se a stack tiver um (fontes: Simple Icons, com licença verificada);
- um prompt de preparação em `docs/prompts/`, no mesmo formato dos existentes.

---

## Mudanças de design

O design de referência está descrito em [docs/design/README.md](docs/design/README.md). Para uma mudança visual:

1. Abra uma issue descrevendo a mudança e o motivo.
2. Atualize primeiro o `docs/design/README.md`, com os novos tokens ou telas.
3. Só então altere o código.
4. Se a mudança desviar do design de referência, registre o desvio na seção 7 do documento.

---

## Checklist de PR

- [ ] A mudança tem uma issue associada ou uma descrição clara do problema.
- [ ] Os testes foram adicionados ou atualizados.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam localmente.
- [ ] A documentação afetada foi atualizada (README, requisitos, design, arquitetura, instalação ou ADR).
- [ ] Mudança visual: a tela foi conferida em 1440 px, e o desvio do design foi registrado se houver.
- [ ] Nenhum segredo, caminho pessoal ou dado real no diff.
- [ ] Os commits seguem Conventional Commits.

---

## Revisão

Revisores verificam, nesta ordem:

1. Se a mudança atende ao requisito referenciado.
2. Corretude e testes.
3. Fidelidade ao design, quando há interface.
4. Segurança: caminhos validados, nada executado a partir de conteúdo de `.feature`, nenhuma chamada de rede externa.
5. Clareza e manutenção.

Comentários dizem o que mudar e por quê.

---

## Reportar regra de negócio com problema

Um problema de regra é um erro de leitura ou de consolidação do app, e não um erro de negócio. Antes de abrir a issue:

1. Confirme que o `.feature` está em UTF-8 e que a tag `@RN-…` está igual nas stacks.
2. Confira se a suíte gerou o relatório no caminho configurado. Sem relatório, o status é "Sem execução", e isso é esperado.
3. Abra a issue com o modelo **Regra de negócio**, incluindo o trecho do arquivo (com nomes fictícios).

---

## Licença das contribuições

Ao enviar um PR, você concorda que sua contribuição será distribuída sob a [licença MIT](LICENSE) do projeto.
