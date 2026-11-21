import { describe, expect, it } from 'vitest';
import { assinaturaDe, calcularAtualizacoes, diferencas, sha256 } from '../src/atualizacoes.js';

describe('assinatura SHA-256 da pasta de testes', () => {
  it('é estável para o mesmo conteúdo, independente da ordem', () => {
    expect(assinaturaDe({ 'a.feature': 'x', 'b.feature': 'y' })).toBe(assinaturaDe({ 'b.feature': 'y', 'a.feature': 'x' }));
  });

  it('muda quando qualquer conteúdo muda', () => {
    expect(assinaturaDe({ 'a.feature': 'x' })).not.toBe(assinaturaDe({ 'a.feature': 'x!' }));
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('diferenças entre a linha de base e a pasta atual', () => {
  it('classifica novos, alterados e removidos', () => {
    const d = diferencas({ 'a.feature': '1', 'b.feature': '2' }, { 'a.feature': '1x', 'c.feature': '3' });
    expect(d).toEqual({ novos: ['c.feature'], alterados: ['a.feature'], removidos: ['b.feature'] });
  });

  it('sem linha de base nada fica pendente', () => {
    const r = calcularAtualizacoes({ arquivos: { 'a.feature': '1' }, contadores: { regras: 1, cenarios: 2 } }, null);
    expect(r.pendentes).toBe(false);
    expect(r.assinatura).toHaveLength(12);
  });

  it('com linha de base igual, nada fica pendente; com diferença, fica', () => {
    const base = { arquivos: { 'a.feature': '1' }, contadores: { regras: 1, cenarios: 2 }, vistoEm: 'x' };
    expect(calcularAtualizacoes({ arquivos: { 'a.feature': '1' }, contadores: { regras: 1, cenarios: 2 } }, base).pendentes).toBe(false);
    const r = calcularAtualizacoes({ arquivos: { 'a.feature': '2' }, contadores: { regras: 1, cenarios: 3 } }, base);
    expect(r).toMatchObject({ pendentes: true, alterados: ['a.feature'], antes: { regras: 1, cenarios: 2 }, agora: { regras: 1, cenarios: 3 } });
  });
});
