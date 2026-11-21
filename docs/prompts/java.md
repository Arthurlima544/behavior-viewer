# Tarefa: preparar o projeto Java para o Behavior Viewer

Você vai adaptar este projeto para que o Behavior Viewer consiga mostrar, para cada funcionalidade BDD, **em qual tela e componente ela se aplica**, o **mapa de rotas**, e **capturas de tela tiradas durante a execução dos testes**. Não altere regras de negócio nem o comportamento da aplicação. Só adicione metadados, configuração e captura de tela.

Stack deste projeto: Java com Cucumber-JVM e Selenium (ou Appium, para mobile). Ajuste se o projeto usar outra combinação. Para testes de API que não têm tela, a parte de telas e capturas não se aplica: diga isso no resumo final.

## 1. Metadados de tela e componente nas funcionalidades

Adicione tags nos arquivos `.feature` usando estas duas chaves:

- `@tela:<NomeDaTela>`: a página (Page Object ou view) onde o comportamento acontece.
- `@componente:<NomeDoComponente>`: o componente principal envolvido.

Regras:
- Coloque as tags no bloco `Feature:` quando a funcionalidade inteira for de uma tela. Use a tag no `Rule:` ou no `Scenario:` quando a regra ou o cenário for de outra tela ou componente.
- Use o nome **exato** da classe, sem espaços (por exemplo, `CheckoutPage` para `CheckoutPage.java`), para que a ferramenta ligue com o código.
- Aceite várias tags de componente por cenário, por exemplo `@componente:ResumoCarrinho @componente:BotaoFinalizar`.
- Não coloque nomes de tela ou componente no título do cenário. O título descreve o resultado para o usuário, por exemplo "Cupom expirado é recusado com mensagem clara".

Exemplo:
```gherkin
@tela:CheckoutPage
Feature: Checkout

  @RN-CHK-001 @componente:FormularioEndereco
  Rule: Pedido só pode ser finalizado com endereço de entrega válido

    Scenario: Finalizar sem endereço válido
      Given o carrinho contém um produto
      When o cliente tenta finalizar sem endereço de entrega
      Then o pedido não deve ser criado
```

## 2. Mapa de telas e rotas em `.behavior.yml`

Crie ou atualize `.behavior.yml` na raiz do projeto com a seção `telas`:

```yaml
nome: <nome-do-projeto>
descricao: <descrição curta>

telas:
  - nome: CheckoutPage
    rota: /checkout
    arquivo: src/main/java/com/exemplo/checkout/CheckoutPage.java
    componentes:
      - nome: ResumoCarrinho
        arquivo: src/main/java/com/exemplo/checkout/ResumoCarrinho.java
      - nome: FormularioEndereco
        arquivo: src/main/java/com/exemplo/checkout/FormularioEndereco.java
```

Para descobrir as rotas reais, leia a configuração de controllers (`@GetMapping`, `@RequestMapping`, `@Route` do Vaadin, ou rotas de um framework web equivalente) e as URLs usadas pelos Page Objects. Não invente rotas. Se uma tela não tiver rota, omita `rota`.

Nos steps que navegam para uma tela, use a rota entre aspas, por exemplo `When o cliente abre "/checkout"`, para que a ferramenta ligue o step à tela. Se o step navega por um helper, garanta que a rota aparece literalmente no texto do step.

## 3. Capturas de tela durante a execução dos testes

Habilite captura em cada passo somente quando a variável de ambiente `BDD_CAPTURAS=1` estiver definida. Sem ela, a execução deve se comportar como hoje.

Salve as imagens em `reports/capturas/<funcionalidade-kebab>/<cenario-kebab>/<indice>-<palavra-chave>.png`, por exemplo `reports/capturas/checkout/finalizar-sem-endereco-valido/02-when.png`.

Ao final de cada cenário, adicione a entrada correspondente em `reports/capturas/indice.json`:

```json
{
  "versao": 1,
  "capturas": [
    {
      "funcionalidade": "Checkout",
      "cenario": "Finalizar sem endereço válido",
      "passo": "When o cliente tenta finalizar sem endereço de entrega",
      "arquivo": "reports/capturas/checkout/finalizar-sem-endereco-valido/02-when.png",
      "tela": "CheckoutPage"
    }
  ]
}
```

Implementação com Cucumber-JVM:

- Crie um hook `@AfterStep` (ou um `@AfterStep` em uma classe de suporte compartilhada pelos step definitions) que tire a captura. Com Selenium use `((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE)`. Com Appium, use o mesmo método, pois o driver também implementa `TakesScreenshot`.
- O objeto `Scenario` do hook dá o nome do cenário (`scenario.getName()`) e o caminho do arquivo (`scenario.getUri()`). Use esse caminho para obter o nome da funcionalidade (o `Feature:` do arquivo) e leia o texto do passo a partir do step atual ou do contador de passos.
- Se o projeto já tem um `@AfterStep` que faz outra coisa, adicione a captura sem alterar esse comportamento.
- Relatórios em paralelo: use um nome de arquivo que inclua o identificador da thread, para não sobrescrever capturas.

## 4. Requisitos gerais

- Mocks determinísticos (WireMock, stubs ou repositórios fake com dados fixos), para que as capturas sejam comparáveis. Nada de rede real nos testes que capturam.
- Use dados fictícios, sem dados pessoais ou segredos.
- Se a captura falhar, registre um aviso no log e continue o teste. Uma falha de captura não pode quebrar o cenário.
- Espere a página estabilizar (`WebDriverWait` por um elemento esperado) antes de capturar.

## 5. Entrega

Ao terminar, entregue:
1. As tags `@tela` e `@componente` nas funcionalidades principais (liste os arquivos alterados).
2. `.behavior.yml` com a seção `telas` preenchida a partir do código real.
3. Os hooks de captura, ativados por `BDD_CAPTURAS=1`.
4. Um comando documentado, por exemplo `BDD_CAPTURAS=1 mvn test` (ou `./gradlew test`), e a lista de arquivos gerados em `reports/capturas/`.
5. Um resumo do que não foi possível mapear e por quê (telas sem rota, steps sem tela identificável, capturas que falharam, testes de API sem tela).

Antes de terminar, execute a suíte normal (sem `BDD_CAPTURAS`) para garantir que nada quebrou, e depois com `BDD_CAPTURAS=1` para confirmar que as imagens e o `indice.json` são gerados.
