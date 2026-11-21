import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseFeatureSource, metadadosDe } from '../src/parser/feature.js';
import { parseProjectConfigText } from '../src/scanner/projectConfig.js';
import { caminhoCapturaValido, capturasDoCenario, lerIndiceCapturas, resolverTelas } from '../src/screens.js';

const tmp = mkdtempSync(join(tmpdir(), 'bv-telas-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('tags @tela- e @componente- (item 1)', () => {
  it('aceita o formato com hífen, exigido pelo runner do Dart', () => {
    expect(metadadosDe(['@tela-CheckoutPage', '@componente-TaskFormSheet', '@componente-Roadmap-Banner'])).toEqual({
      telas: ['CheckoutPage'],
      componentes: ['TaskFormSheet', 'Roadmap-Banner'],
    });
  });

  it('rejeita tags que não são identificadores (com espaço, ponto ou barra)', () => {
    expect(metadadosDe(['@tela-Checkout Page', '@tela-a.b', '@tela-a/b'])).toEqual({ telas: [], componentes: [] });
  });

  it('lê telas e componentes das tags', () => {
    expect(metadadosDe(['@tela:CheckoutPage', '@componente:A', '@componente:B', '@outra'])).toEqual({
      telas: ['CheckoutPage'],
      componentes: ['A', 'B'],
    });
  });

  it('herança: funcionalidade → regra → cenário, com a declaração mais específica vencendo', () => {
    const src = `# language: pt
@tela:CheckoutPage
Funcionalidade: Checkout

  @RN-CHK-001 @componente:Form
  Regra: Endereço obrigatório

    Cenário: Sem endereço
      Dado algo

  @RN-CHK-002 @tela:CarrinhoPage
  Regra: Carrinho

    @componente:Resumo
    Cenário: Mostra resumo
      Dado algo
`;
    const out = parseFeatureSource(src, 'x.feature');
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    const [r1, r2] = out.funcionalidade.regras;
    expect(r1?.telas).toEqual(['CheckoutPage']);
    expect(r1?.componentes).toEqual(['Form']);
    expect(r1?.cenarios[0]?.telas).toEqual(['CheckoutPage']);
    expect(r1?.cenarios[0]?.componentes).toEqual(['Form']);
    expect(r2?.telas).toEqual(['CarrinhoPage']);
    expect(r2?.cenarios[0]?.componentes).toEqual(['Resumo']);
    expect(r2?.cenarios[0]?.telas).toEqual(['CarrinhoPage']);
  });
});

describe('seção telas do .behavior.yml (item 3)', () => {
  it('lê telas com rota, arquivo e componentes', () => {
    const r = parseProjectConfigText(`telas:
  - nome: CheckoutPage
    rota: /checkout
    arquivo: src/CheckoutPage.tsx
    componentes:
      - nome: Resumo
        arquivo: src/Resumo.tsx
`);
    expect(r.error).toBeUndefined();
    expect(r.config?.telas[0]).toEqual({
      nome: 'CheckoutPage',
      rota: '/checkout',
      arquivo: 'src/CheckoutPage.tsx',
      componentes: [{ nome: 'Resumo', arquivo: 'src/Resumo.tsx' }],
    });
  });

  it('rota sem "/" inicial é erro de configuração com mensagem', () => {
    const r = parseProjectConfigText('telas:\n  - nome: X\n    rota: checkout\n');
    expect(r.config).toBeNull();
    expect(r.error).toMatch(/começar com "\/"/);
  });

  it('tela sem nome é erro', () => {
    const r = parseProjectConfigText('telas:\n  - rota: /x\n');
    expect(r.error).toMatch(/nome/);
  });
});

describe('resolução de telas e capturas (item 3 e 4)', () => {
  const telas = [
    { nome: 'CheckoutPage', rota: '/checkout', componentes: [{ nome: 'Resumo', arquivo: 'R.tsx' }] },
    { nome: 'CupomPage', rota: '/carrinho/cupom', componentes: [] },
  ];

  it('tela por tag e tela por rota citada num passo', () => {
    const refs = resolverTelas(['CheckoutPage'], ['Dado que o cliente abre "/carrinho/cupom"'], telas);
    expect(refs.map((r) => [r.nome, r.origem, r.rota])).toEqual([
      ['CheckoutPage', 'tag', '/checkout'],
      ['CupomPage', 'rota', '/carrinho/cupom'],
    ]);
    expect(refs[0]?.componentes).toEqual([{ nome: 'Resumo', arquivo: 'R.tsx' }]);
  });

  it('tag de tela que não está no .behavior.yml fica como não declarada', () => {
    const refs = resolverTelas(['TelaInexistente'], [], telas);
    expect(refs[0]).toMatchObject({ nome: 'TelaInexistente', declarada: false, rota: null });
  });

  it('caminho de captura: só relativo, sem "..", com extensão de imagem', () => {
    expect(caminhoCapturaValido('reports/capturas/a/b/01.png')).toBe(true);
    expect(caminhoCapturaValido('/etc/passwd.png')).toBe(false);
    expect(caminhoCapturaValido('../segredo.png')).toBe(false);
    expect(caminhoCapturaValido('reports/x.txt')).toBe(false);
  });

  it('índice inválido gera avisos sem derrubar as entradas válidas', async () => {
    const dir = join(tmp, 'indice');
    mkdirSync(join(dir, 'reports', 'capturas'), { recursive: true });
    writeFileSync(
      join(dir, 'reports', 'capturas', 'indice.json'),
      JSON.stringify({
        capturas: [
          { funcionalidade: 'F', cenario: 'C', passo: 'p', arquivo: 'reports/capturas/ok.png', tela: 'T' },
          { funcionalidade: 'F', cenario: 'C', passo: 'p', arquivo: '../fora.png' },
          { funcionalidade: 'F' },
        ],
      }),
    );
    const leitura = await lerIndiceCapturas(dir);
    expect(leitura.entradas).toHaveLength(1);
    expect(leitura.erros).toHaveLength(2);
    expect(capturasDoCenario(leitura.entradas, 'f', 'c')).toEqual([
      { passo: 'p', arquivo: 'reports/capturas/ok.png', tela: 'T' },
    ]);
  });

  it('índice ausente não é erro', async () => {
    const leitura = await lerIndiceCapturas(join(tmp, 'sem-indice'));
    expect(leitura).toEqual({ entradas: [], erros: [] });
  });
});
