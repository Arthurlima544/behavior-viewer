# Prompts para preparar projetos

Cada arquivo é um prompt autocontido para um agente de código adaptar um projeto BDD
para o Behavior Viewer, habilitando três recursos:

1. **Tags de tela e componente** (`@tela:` e `@componente:`) nas funcionalidades.
2. **Mapa de telas e rotas** no `.behavior.yml`.
3. **Capturas de tela** tiradas durante a execução dos testes, com índice em `reports/capturas/indice.json`.

| Stack | Arquivo |
|---|---|
| React / TypeScript (Cucumber.js + Playwright) | [react-typescript.md](react-typescript.md) |
| Flutter (integration_test + BDD) | [flutter.md](flutter.md) |
| Java (Cucumber-JVM + Selenium ou Appium) | [java.md](java.md) |

Use apenas o arquivo da stack do projeto. Se o projeto tiver mais de uma stack, use um arquivo por stack.
