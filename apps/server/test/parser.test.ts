import { describe, expect, it } from 'vitest';
import { consolidationKey, displayRuleId, parseFeatureSource } from '../src/parser/feature.js';
import { ResultIndex, parseCucumberJson, parseJUnitXml } from '../src/parser/reports.js';

const PT_FEATURE = `# language: pt
Funcionalidade: Cupons de desconto

  @RN-CUP-003 @promo
  Regra: Cupom não se soma a outra promoção

    Cenário: Produto em promoção
      Dado que o carrinho contém um item em promoção
      E que o cupom é BEMVINDO10
      Quando o cliente aplicar o cupom
      Então o cupom deve ser recusado
`;

describe('parseFeatureSource (RF-06, RF-07, RF-08)', () => {
  it('lê o idioma pt, a tag @RN- e a situação e o resultado do primeiro cenário', () => {
    const out = parseFeatureSource(PT_FEATURE, 'cupons.feature');
    expect(out.ok).toBe(true);
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    const f = out.funcionalidade;
    expect(f.idioma).toBe('pt');
    expect(f.nome).toBe('Cupons de desconto');
    expect(f.regras).toHaveLength(1);
    const rule = f.regras[0]!;
    expect(rule.idTag).toBe('RN-CUP-003');
    expect(rule.origem).toBe('tag');
    expect(rule.tags).toEqual(['@promo']);
    expect(rule.titulo).toBe('Cupom não se soma a outra promoção');
    expect(rule.situacao).toBe('O carrinho contém um item em promoção');
    expect(rule.resultado).toBe('O cupom deve ser recusado');
    expect(rule.cenarios[0]?.passos.map((p) => p.palavra)).toEqual([
      'Dado',
      'E',
      'Quando',
      'Então',
    ]);
    expect(rule.avisos).toEqual([]);
  });

  it('marca como provisória a regra sem tag @RN- e avisa', () => {
    const src = `Feature: X\n  Rule: Sem ID\n    Scenario: a\n      Given algo\n`;
    const out = parseFeatureSource(src, 'x.feature');
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    const rule = out.funcionalidade.regras[0]!;
    expect(rule.origem).toBe('provisorio');
    expect(rule.avisos[0]).toMatch(/sem ID/);
    expect(displayRuleId(rule, 'X')).toMatch(/^PROV-[0-9a-f]{6}$/);
  });

  it('cenário solto vira regra implícita (RF-10)', () => {
    const src = `Feature: Y\n  Scenario: solto\n    Given algo\n    When x\n    Then y\n`;
    const out = parseFeatureSource(src, 'y.feature');
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    const rule = out.funcionalidade.regras[0]!;
    expect(rule.origem).toBe('implicita');
    expect(rule.titulo).toBe('solto');
    expect(displayRuleId(rule, 'Y')).toMatch(/^IMP-SOLTO-/);
  });

  it('Scenario Outline guarda os exemplos com cabeçalho (RF-06)', () => {
    const src = `Feature: Z
  @RN-Z-001
  Rule: Valor
    Scenario Outline: soma
      Given <a> e <b>
      Then total <c>
      Examples:
        | a | b | c |
        | 1 | 2 | 3 |
`;
    const out = parseFeatureSource(src, 'z.feature');
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    const sc = out.funcionalidade.regras[0]!.cenarios[0]!;
    expect(sc.tipo).toBe('esquema');
    expect(sc.exemplos).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('erro de sintaxe retorna linha e mensagem sem lançar exceção (RF-12)', () => {
    const out = parseFeatureSource(
      'Feature: q\n  Scenario Outline: a\n    Given <x>\n    Examples:\n      | x | y |\n      | 1 |\n',
      'q.feature'
    );
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('esperado erro');
    expect(out.erros.length).toBeGreaterThan(0);
    expect(out.erros[0]?.linha).toBeTypeOf('number');
  });

  it('consolidação usa o ID da tag ou o título normalizado (RF-13, RF-14)', () => {
    const out = parseFeatureSource(PT_FEATURE, 'c.feature');
    if (!out.ok || !out.funcionalidade) throw new Error('esperado sucesso');
    expect(consolidationKey(out.funcionalidade.regras[0]!, 'Cupons de desconto')).toBe(
      'id:RN-CUP-003'
    );
  });
});

describe('relatórios (RF-17, RF-18)', () => {
  it('Cucumber JSON: falha vence, undefined vira pendente', () => {
    const json = JSON.stringify([
      {
        name: 'F',
        elements: [
          { type: 'scenario', name: 'ok', steps: [{ result: { status: 'passed' } }] },
          {
            type: 'scenario',
            name: 'falha',
            steps: [{ result: { status: 'passed' } }, { result: { status: 'failed' } }],
          },
          { type: 'scenario', name: 'pend', steps: [{ result: { status: 'undefined' } }] },
        ],
      },
    ]);
    const idx = new ResultIndex(parseCucumberJson(json));
    expect(idx.lookup('F', 'ok')).toBe('passou');
    expect(idx.lookup('F', 'falha')).toBe('falhou');
    expect(idx.lookup('F', 'pend')).toBe('pendente');
    expect(idx.lookup('F', 'nao existe')).toBe('sem-execucao');
  });

  it('JUnit XML: failure marca falha e skipped marca sem-execução', () => {
    const xml = `<testsuites><testsuite name="s"><testcase classname="F" name="a"/><testcase classname="F" name="b"><failure>x</failure></testcase><testcase classname="F" name="c"><skipped/></testcase></testsuite></testsuites>`;
    const idx = new ResultIndex(parseJUnitXml(xml));
    expect(idx.lookup('F', 'a')).toBe('passou');
    expect(idx.lookup('F', 'b')).toBe('falhou');
    expect(idx.lookup('F', 'c')).toBe('sem-execucao');
  });
});
