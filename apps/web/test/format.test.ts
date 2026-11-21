import { describe, expect, it } from 'vitest';
import { atalhoBusca, ehPalavraChave, rotuloStatus, tempoRelativo } from '../src/lib/format';
import { rotas } from '../src/lib/paths';

describe('tempoRelativo (RF-21)', () => {
  const agora = Date.parse('2026-11-21T12:00:00Z');
  it('formata minutos, horas e dias em pt-BR', () => {
    expect(tempoRelativo('2026-11-21T11:48:00Z', agora)).toBe('há 12 min');
    expect(tempoRelativo('2026-11-21T10:00:00Z', agora)).toBe('há 2 h');
    expect(tempoRelativo('2026-11-19T12:00:00Z', agora)).toBe('há 2 dias');
    expect(tempoRelativo('2026-11-21T11:59:50Z', agora)).toBe('agora');
  });
  it('sem data indica ausência de registro', () => {
    expect(tempoRelativo(null)).toBe('sem registro');
  });
});

describe('rotuloStatus', () => {
  it('indica a stack quando a regra falha', () => {
    expect(rotuloStatus('falhando', 'TypeScript')).toBe('Falhando em TypeScript');
    expect(rotuloStatus('passando')).toBe('Passando');
  });
});

describe('ehPalavraChave', () => {
  it('reconhece palavras-chave em português e inglês', () => {
    expect(ehPalavraChave('Dado')).toBe(true);
    expect(ehPalavraChave('Then')).toBe(true);
    expect(ehPalavraChave('Cenário')).toBe(false);
  });
});

describe('atalhoBusca (RF-47)', () => {
  it('retorna um atalho com rótulo de acessibilidade', () => {
    expect(atalhoBusca().aria).toMatch(/K$/);
  });
});

describe('rotas', () => {
  it('codifica identificadores e monta a apresentação com a regra inicial', () => {
    expect(rotas.regra('marketplace-1', 'RN-CUP-003')).toBe('/projetos/marketplace-1/regras/RN-CUP-003');
    expect(rotas.apresentacao('p', 'cupons-de-desconto', 'RN-CUP-001')).toBe(
      '/projetos/p/apresentar/cupons-de-desconto?regra=RN-CUP-001',
    );
  });
});
