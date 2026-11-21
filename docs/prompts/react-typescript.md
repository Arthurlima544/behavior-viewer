# Tarefa: preparar o projeto React / TypeScript para o Behavior Viewer

Você vai adaptar este projeto para que o Behavior Viewer consiga mostrar, para cada funcionalidade BDD, **em qual tela e componente ela se aplica**, o **mapa de rotas**, e **capturas de tela tiradas durante a execução dos testes**. Não altere regras de negócio nem o comportamento da aplicação. Só adicione metadados, configuração e captura de tela.

Stack deste projeto: React + TypeScript, testes com Cucumber.js e Playwright (ajuste se o projeto usar outra combinação).

## 1. Metadados de tela e componente nas funcionalidades

Adicione tags nos arquivos `.feature` usando estas duas chaves:

- `@tela-<NomeDaTela>`: a página ou rota onde o comportamento acontece.
- `@componente-<NomeDoComponente>`: o componente principal envolvido.

Regras:
- Coloque as tags no bloco `Funcionalidade:` quando a funcionalidade inteira for de uma tela. Use a tag no `Rule:` ou no `Cenário:` quando a regra ou o cenário for de outra tela ou componente.
- Use o nome **exato** do arquivo ou componente, sem espaços (por exemplo, `CheckoutPage` para `CheckoutPage.tsx`), para que a ferramenta consiga ligar com o código.
- Aceite várias tags de componente por cenário, por exemplo `@componente-ResumoCarrinho @componente-BotaoFinalizar`.
- Não coloque nomes de tela ou componente no título do cenário. O título descreve o resultado para o usuário, por exemplo "Cupom expirado é recusado com mensagem clara".

Exemplo:
```gherkin
@tela-CheckoutPage
Funcionalidade: Checkout

  @RN-CHK-001 @componente-FormularioEndereco
  Regra: Pedido só pode ser finalizado com endereço de entrega válido

    Cenário: Finalizar sem endereço válido
      Dado que o carrinho contém um produto
      Quando o cliente tenta finalizar sem endereço de entrega
      Então o pedido não deve ser criado
```

## 2. Mapa de telas e rotas em `.behavior.yml`

Crie ou atualize `.behavior.yml` na raiz do projeto com a seção `telas`:

```yaml
nome: <nome-do-projeto>
descricao: <descrição curta>

telas:
  - nome: CheckoutPage
    rota: /checkout
    arquivo: src/pages/CheckoutPage.tsx
    componentes:
      - nome: ResumoCarrinho
        arquivo: src/components/ResumoCarrinho.tsx
      - nome: FormularioEndereco
        arquivo: src/components/FormularioEndereco.tsx
```

Para descobrir as telas e rotas reais, leia a configuração de rotas do projeto: `<Route>` do react-router, `createBrowserRouter`, arquivos de `app/` ou `pages/` do Next.js, ou o equivalente. Não invente rotas. Se uma tela não tiver rota, omita `rota`.

Nos steps que navegam para uma tela, use a rota entre aspas, por exemplo `Quando o cliente abre "/checkout"`, para que a ferramenta ligue o step à tela. Se o step navega por um helper (`page.goto(ROTAS.checkout)`), garanta que a rota aparece literalmente no texto do step.

## 3. Capturas de tela durante a execução dos testes

Habilite captura em cada passo somente quando `BDD_CAPTURAS=1` estiver definido. Sem essa variável, a execução deve se comportar como hoje.

Salve as imagens em `reports/capturas/<funcionalidade-kebab>/<cenario-kebab>/<indice>-<palavra-chave>.png`, por exemplo `reports/capturas/checkout/finalizar-sem-endereco-valido/02-quando.png`.

Ao final de cada cenário, adicione a entrada correspondente em `reports/capturas/indice.json`:

```json
{
  "versao": 1,
  "capturas": [
    {
      "funcionalidade": "Checkout",
      "cenario": "Finalizar sem endereço válido",
      "passo": "Quando o cliente tenta finalizar sem endereço de entrega",
      "arquivo": "reports/capturas/checkout/finalizar-sem-endereco-valido/02-quando.png",
      "tela": "CheckoutPage"
    }
  ]
}
```

Implementação para Cucumber.js com Playwright:

- Use um hook `AfterStep` que chame `page.screenshot({ path, fullPage: true })` com a página do seu World (ou do fixture do Playwright).
- Para obter o nome da funcionalidade e do cenário, use um hook `Before` que receba `{ pickle, gherkinDocument }` e guarde esses dados no World. `pickle.name` é o cenário e `gherkinDocument.feature.name` é a funcionalidade. Confirme a assinatura na versão do Cucumber.js instalada.
- Para a palavra-chave do passo, use `pickleStep` no hook de passo.
- Se o projeto não usa Playwright, use a API de screenshot da ferramenta de teste em uso.

## 4. Requisitos gerais

- Mocks determinísticos (mesmos dados a cada execução), para que as capturas sejam comparáveis (MSW ou o mock server que o projeto já tem).
- Nada de rede real nas capturas. Use dados fictícios, sem dados pessoais ou segredos.
- Se a captura falhar, registre um aviso e continue o teste. Uma falha de captura não pode quebrar o cenário.
- Animações e transições: desligue ou espere o fim antes de capturar (`animations: 'disabled'` no Playwright).

## 5. Entrega

Ao terminar, entregue:
1. As tags `@tela` e `@componente` nas funcionalidades principais (liste os arquivos alterados).
2. `.behavior.yml` com a seção `telas` preenchida a partir do código real.
3. Os hooks de captura, ativados por `BDD_CAPTURAS=1`.
4. Um comando documentado, por exemplo `BDD_CAPTURAS=1 npm run test:bdd`, e a lista de arquivos gerados em `reports/capturas/`.
5. Um resumo do que não foi possível mapear e por quê (telas sem rota, steps sem tela identificável, capturas que falharam).

Antes de terminar, execute a suíte normal (sem `BDD_CAPTURAS`) para garantir que nada quebrou, e depois com `BDD_CAPTURAS=1` para confirmar que as imagens e o `indice.json` são gerados.
