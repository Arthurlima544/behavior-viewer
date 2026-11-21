# Guia de contribuição

Obrigado por considerar contribuir com o Behavior Viewer. Este guia explica como reportar problemas, propor mudanças e enviar código.

Antes de começar, leia:

- [Requisitos](docs/requisitos.md): o que o produto deve fazer.
- [Design](docs/design/README.md): como a interface deve ser.
- [Arquitetura](docs/arquitetura.md) e [tech stack](docs/tech-stack.md): como o código está organizado.
- [ADRs](docs/adr/README.md): decisões tomadas e pendentes. Não implemente uma decisão marcada como **A confirmar** sem alinhar antes.

Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

---

## Formas de contribuir

| Tipo | Como |
|---|---|
| Relatar bug | Abra uma issue com o modelo **Bug**. Inclua sistema operacional, versão da imagem, passos e a saída de `docker compose logs`. |
| Sugerir funcionalidade | Abra uma issue com o modelo **Funcionalidade**. Relacione com um requisito de [requisitos.md](docs/requisitos.md) ou explique o novo caso. |
| Reportar regra mal interpretada | Abra uma issue com o modelo **Regra de negócio**. Informe o ID, o arquivo `.feature` (ou um trecho anonimizado) e o que o app mostrou. |
| Melhorar a documentação | PR direto, com a alteração em um único tópico. |
| Adicionar uma stack | Veja [Adicionar uma nova stack](#adicionar-uma-nova-stack). |
| Corrigir código ou design | Siga o fluxo de PR abaixo. |

Problemas de segurança **não** devem ser abertos como issue pública. Veja [SECURITY.md](SECURITY.md).

---

## Ambiente de desenvolvimento

Pré-requisitos:

- Node.js 22 LTS
- npm 10 ou superior
- Docker com Compose v2 (para testes de imagem)
- Git

Passos:

```bash
git clone <url-do-repositorio>
cd behavior-viewer
npm ci
npm run dev          # API em :8787 e interface em :5173, com recarga (usa as fixtures)
npm test             # testes unitários (domínio, servidor e interface)
npm run test:e2e     # E2E no Chromium, com o servidor real sobre as fixtures
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit em todos os pacotes
```

Para subir a imagem como em produção:

```bash
docker compose up --build
```

### Projetos de exemplo

As fixtures em `fixtures/` simulam projetos reais. Use-as para testar o scanner e o parser sem depender de código de terceiros. O modo `npm run dev` já aponta para elas por meio de `apps/server/.env.development`.

Regressão visual contra os artboards do design ainda não está automatizada (ver [roadmap](docs/roadmap.md)). Ao mexer em tela, compare com o design à mão.

| Fixture | Testa |
|---|---|
| `fixtures/flutter-app/` | Detecção Flutter, relatório JUnit |
| `fixtures/ts-web/` | Detecção TypeScript, relatório Cucumber JSON |
| `fixtures/java-api/` | Detecção Java, falhas e pendências |
| `fixtures/pt-br/` | `# language: pt` |
| `fixtures/erros/` | Erro de sintaxe isolado por arquivo |
| `fixtures/sem-rule/` | Regras implícitas |

---

## Fluxo de contribuição

1. **Abra ou encontre uma issue.** Para mudanças grandes, alinhe antes na issue para evitar retrabalho.
2. **Crie uma branch curta** a partir de `main`:
   - `feat/<descricao-curta>`
   - `fix/<descricao-curta>`
   - `docs/<descricao-curta>`
   - `refactor/<descricao-curta>`
   - `test/<descricao-curta>`
3. **Escreva o código e os testes** no mesmo PR.
4. **Atualize a documentação** que a mudança afeta (requisito, design, arquitetura ou ADR).
5. **Rode a checagem local:** `npm run lint && npm run typecheck && npm test`.
6. **Abra o PR** usando o modelo. Preencha o checklist.
7. **Revisão:** pelo menos uma aprovação. O CI precisa passar.
8. **Merge:** por squash, com a mensagem do PR como título do commit.

Mantenha os PRs pequenos. Um PR deve resolver um problema. Se a mudança passar de cerca de 400 linhas alteradas, considere dividir.

---

## Mensagens de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
<tipo>(<escopo opcional>): <descrição no imperativo, em minúsculas>

<corpo opcional explicando o porquê>

<rodapé opcional, ex.: Refs: #123>
```

Tipos aceitos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

Exemplos:

```
feat(parser): ler a tag de ID de regra no bloco Rule
fix(status): tratar cenário sem resultado como sem execução
docs(design): corrigir o token de cor do texto secundário
```

Mudanças que quebram compatibilidade devem ter `!` após o tipo ou `BREAKING CHANGE:` no rodapé.

Para mudanças visíveis ao usuário, adicione um arquivo Changeset (`npx changeset`).

---

## Padrões de código

### Geral

- TypeScript em modo estrito. Sem `any` sem justificativa em comentário.
- Funções puras sempre que possível. Lógica de status e consolidação fica em `packages/domain`, sem I/O.
- Erros são tratados na borda (API, scanner). Dentro do domínio, use tipos de resultado.
- Nenhum segredo, caminho pessoal ou dado de projeto real em código, fixture ou log.

### Interface

- **Nunca** escreva cor hexadecimal diretamente em componente. Use as variáveis de `--` definidas em [docs/design/README.md §2](docs/design/README.md#2-tokens).
- Um componente novo precisa de entrada em [docs/design/README.md §3](docs/design/README.md#3-componentes) antes do código.
- Status nunca é indicado só por cor. Use cor, forma e texto.
- Botões só com ícone precisam de `aria-label`. Use elementos semânticos (`button`, `a`, `input` com `label`).
- Textos da interface vêm do arquivo de mensagens, não ficam fixos no componente (RNF-10).
- Conteúdo de `.feature` é sempre renderizado como texto, nunca como HTML (RNF-11).

### Testes

- Parser, extrator, consolidador e cálculo de status: **teste unitário obrigatório**.
- Mudança em scanner ou detecção de stack: **teste com fixture** em `fixtures/`.
- Mudança visual: **atualizar a captura de regressão** e explicar a diferença no PR.
- Cobertura mínima do domínio e do parser: 80%.

---

## Adicionar uma nova stack

Uma stack é um adaptador com três partes:

1. **Detecção:** regra em `apps/server/src/scanner/stacks/` que reconhece o manifesto (RF-04).
2. **Relatórios:** leitor de relatório, se o formato ainda não for suportado (RF-17).
3. **Fixture:** um projeto mínimo em `fixtures/<stack>/` com `.feature` e relatório gerado de verdade.

No PR, inclua:

- a regra de detecção e o teste dela;
- a fixture;
- a linha da stack em [requisitos.md](docs/requisitos.md) e em [tech-stack.md](docs/tech-stack.md);
- o ícone da stack, se for necessário um novo (ver [design §2.4](docs/design/README.md#24-ícones)).

---

## Mudanças de design

O design de referência está no canvas citado em [docs/design/README.md](docs/design/README.md). Quando uma mudança visual for desejada:

1. Abra uma issue descrevendo a mudança e o motivo.
2. Atualize primeiro o `docs/design/README.md` com os novos tokens ou telas.
3. Só então altere o código.
4. Atualize as capturas de regressão no mesmo PR.

Se o canvas for alterado, atualize também este documento e cite a versão.

---

## Checklist de PR

- [ ] A mudança tem uma issue associada ou uma descrição clara do problema.
- [ ] Os testes foram adicionados ou atualizados.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam localmente.
- [ ] A documentação afetada foi atualizada (requisitos, design, arquitetura ou ADR).
- [ ] Mudança visual: capturas atualizadas e diferença explicada.
- [ ] Nenhum segredo, caminho pessoal ou dado real de projeto no diff.
- [ ] Commit segue Conventional Commits.
- [ ] Se for visível ao usuário, há um Changeset.

---

## Revisão

Revisores verificam, nesta ordem:

1. Se a mudança atende ao requisito referenciado.
2. Corretude e testes.
3. Fidelidade ao design, quando há interface.
4. Segurança: leitura somente, sem execução de conteúdo de `.feature`, sem chamadas de rede.
5. Clareza e manutenção.

Seja objetivo e respeitoso. Comentários dizem o que mudar e por quê.

---

## Reportar regra de negócio com problema

Um bug de regra é um erro de leitura ou de consolidação do app, não um erro de negócio. Se o app mostrar uma regra com a stack, o ID ou o status errado:

1. Confirme que o `.feature` está correto e em UTF-8.
2. Confira se a tag `@RN-…` está escrita igual nas duas stacks.
3. Abra a issue com o modelo **Regra de negócio** e inclua o trecho do arquivo (pode trocar nomes reais por fictícios).

---

## Licença das contribuições

Ao enviar um PR, você concorda que sua contribuição será distribuída sob a [licença MIT](LICENSE) do projeto.
