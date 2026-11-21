# Política de segurança

## Versões suportadas

| Versão | Suporte de segurança |
|---|---|
| Última versão `1.x` | Sim |
| Versões anteriores | Não |

Enquanto o projeto estiver na fase de planejamento (antes de `1.0.0`), nenhuma versão recebe suporte de segurança formal.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades.**

Reporte por um dos canais abaixo:

1. **Aba Security do repositório** (GitHub → Security → Report a vulnerability), que cria um aviso privado. *(preferencial)*
2. Se o canal acima não estiver disponível, entre em contato com os mantenedores por um canal privado indicado no perfil do projeto.

Inclua na mensagem:

- descrição do problema e o impacto que você imagina;
- passos para reproduzir, idealmente com uma fixture mínima;
- versão da imagem, sistema operacional e versão do Docker;
- se o problema depende de configuração específica (ex.: porta exposta em `0.0.0.0`).

## O que esperar

- Confirmação de recebimento em até **5 dias úteis**.
- Avaliação inicial e classificação de gravidade em até **10 dias úteis**.
- Correção e divulgação coordenada com quem reportou. Vulnerabilidades críticas recebem prioridade.
- Crédito no changelog, se você desejar.

## Escopo

Estão no escopo:

- leitura ou escrita indevida fora do workspace montado;
- execução de conteúdo de arquivos `.feature` ou relatórios (ex.: XSS, injeção);
- exposição de dados do workspace pela API ou pela porta publicada;
- chamadas de rede não previstas em tempo de execução (RNF-04);
- vulnerabilidades em dependências que afetem o produto.

Não estão no escopo:

- problemas que dependem de a porta ser exposta publicamente pelo próprio usuário, desde que a documentação recomende `127.0.0.1` (RNF-05);
- ataques que exigem acesso root à máquina do usuário;
- engenharia social.

## Boas práticas para quem usa

- Mantenha a porta publicada em `127.0.0.1`.
- Monte o workspace sempre com `:ro`.
- Não publique relatórios de execução que contenham segredos. O app lê esses arquivos.
- Atualize a imagem para a versão mais recente.
