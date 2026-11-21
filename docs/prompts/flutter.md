# Tarefa: preparar o projeto Flutter para o Behavior Viewer

Você vai adaptar este projeto para que o Behavior Viewer consiga mostrar, para cada funcionalidade BDD, **em qual tela e widget ela se aplica**, o **mapa de rotas**, e **capturas de tela tiradas durante a execução dos testes de integração**. Não altere regras de negócio nem o comportamento do aplicativo. Só adicione metadados, configuração e captura de tela.

Stack deste projeto: Flutter com testes de integração (`integration_test`) e BDD (ajuste o nome da biblioteca, por exemplo `bdd_widget_test` ou `flutter_gherkin`, conforme o `pubspec.yaml`).

## 1. Metadados de tela e componente nas funcionalidades

Adicione tags nos arquivos `.feature` usando estas duas chaves:

- `@tela:<NomeDaTela>`: a classe da tela (`Screen` ou `Page`) onde o comportamento acontece.
- `@componente:<NomeDoWidget>`: o widget principal envolvido.

Regras:
- Coloque as tags no bloco `Funcionalidade:` quando a funcionalidade inteira for de uma tela. Use a tag no `Rule:` ou no `Cenário:` quando a regra ou o cenário for de outra tela ou widget.
- Use o nome **exato** da classe, sem espaços (por exemplo, `CheckoutScreen` para `class CheckoutScreen`), para que a ferramenta ligue com o código.
- Aceite várias tags de componente por cenário, por exemplo `@componente:ResumoCarrinho @componente:BotaoFinalizar`.
- Não coloque nomes de tela ou widget no título do cenário. O título descreve o resultado para o usuário, por exemplo "Cupom expirado é recusado com mensagem clara".

Exemplo:
```gherkin
@tela:CheckoutScreen
Funcionalidade: Checkout

  @RN-CHK-001 @componente:FormularioEndereco
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
  - nome: CheckoutScreen
    rota: /checkout
    arquivo: lib/features/checkout/checkout_screen.dart
    componentes:
      - nome: ResumoCarrinho
        arquivo: lib/features/checkout/widgets/resumo_carrinho.dart
      - nome: FormularioEndereco
        arquivo: lib/features/checkout/widgets/formulario_endereco.dart
```

Para descobrir as rotas reais, leia a configuração de navegação: `GoRouter` (`path:` de cada `GoRoute`), `onGenerateRoute`, ou as rotas nomeadas do `MaterialApp`. Não invente rotas. Se uma tela não tiver rota (abertura por `Navigator.push`), omita `rota`.

Nos steps que navegam para uma tela, use a rota entre aspas, por exemplo `Quando o cliente abre "/checkout"`, para que a ferramenta ligue o step à tela. Se o step navega por um helper, garanta que a rota aparece literalmente no texto do step.

## 3. Capturas de tela durante a execução dos testes

Habilite captura em cada passo somente quando `BDD_CAPTURAS=1` estiver definido (use `const bool.fromEnvironment` ou `Platform.environment` no driver). Sem essa variável, a execução deve se comportar como hoje.

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
      "tela": "CheckoutScreen"
    }
  ]
}
```

Implementação:

- No teste de integração, use `binding.takeScreenshot('<nome>')` do `IntegrationTestWidgetsFlutterBinding`. Chame `binding.convertFlutterSurfaceToImage()` antes, em Android e iOS.
- Os bytes chegam ao driver pelo callback `onScreenshot` de `integrationDriver(...)` (em `test_driver/integration_test.dart`). Grave o arquivo nesse callback, no caminho acima, a partir do nome recebido. Esse é o mecanismo oficial, e não depende de permissões de sistema de arquivos do dispositivo.
- Para saber a funcionalidade, o cenário e o passo em cada captura, use os hooks da biblioteca BDD em uso (por exemplo `onBefore` e `onAfterStep` no `flutter_gherkin`, ou o equivalente no `bdd_widget_test`) e guarde esses dados em uma variável estática que o nome da captura usa.
- Confirme a API da versão da biblioteca instalada antes de codar. Se a biblioteca não expuser o passo, derive o nome a partir do próprio texto do passo.

## 4. Requisitos gerais

- Mocks determinísticos (repositórios fake com dados fixos), para que as capturas sejam comparáveis. Nada de rede real.
- Use dados fictícios, sem dados pessoais ou segredos.
- Se a captura falhar, registre um aviso e continue o teste. Uma falha de captura não pode quebrar o cenário.
- Espere a animação terminar com `pumpAndSettle()` antes de capturar.

## 5. Entrega

Ao terminar, entregue:
1. As tags `@tela` e `@componente` nas funcionalidades principais (liste os arquivos alterados).
2. `.behavior.yml` com a seção `telas` preenchida a partir do código real.
3. Os hooks e o `integrationDriver` com captura, ativados por `BDD_CAPTURAS=1`.
4. Um comando documentado, por exemplo `BDD_CAPTURAS=1 flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart`, e a lista de arquivos gerados em `reports/capturas/`.
5. Um resumo do que não foi possível mapear e por quê (telas sem rota, steps sem tela identificável, capturas que falharam em algum dispositivo).

Antes de terminar, execute a suíte normal (sem `BDD_CAPTURAS`) para garantir que nada quebrou, e depois com `BDD_CAPTURAS=1` para confirmar que as imagens e o `indice.json` são gerados.
