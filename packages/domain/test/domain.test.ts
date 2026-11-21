import { describe, expect, it } from 'vitest';
import {
  aggregateStatus,
  buildCoverageMatrix,
  executionOutcome,
  findDivergences,
  normalizeTitle,
  shortHash,
  summarizeStatuses,
} from '../src/index.js';

describe('normalizeTitle (RF-14)', () => {
  it('ignora caixa, acentos, pontuação e espaços extras', () => {
    expect(normalizeTitle('  Cupom não se soma  a outra promoção!  ')).toBe(
      'cupom nao se soma a outra promocao'
    );
  });
});

describe('shortHash', () => {
  it('é estável e tem 6 caracteres', () => {
    expect(shortHash('checkout.feature|regra')).toHaveLength(6);
    expect(shortHash('abc')).toBe(shortHash('abc'));
    expect(shortHash('abc')).not.toBe(shortHash('abd'));
  });
});

describe('aggregateStatus (RF-19)', () => {
  it('sem resultados é sem-execucao', () => {
    expect(aggregateStatus([])).toBe('sem-execucao');
  });
  it('falha tem prioridade sobre pendente e sem-execucao', () => {
    expect(aggregateStatus(['passou', 'falhou', 'pendente'])).toBe('falhando');
  });
  it('pendente tem prioridade sobre sem-execucao', () => {
    expect(aggregateStatus(['passou', 'pendente', 'sem-execucao'])).toBe('pendente');
  });
  it('sem-execucao quando algum cenário não foi executado e nada falhou', () => {
    expect(aggregateStatus(['passou', 'sem-execucao'])).toBe('sem-execucao');
  });
  it('passando só quando todos passaram', () => {
    expect(aggregateStatus(['passou', 'passou'])).toBe('passando');
  });
});

describe('executionOutcome', () => {
  it('mapeia status agregado para resultado de execução', () => {
    expect(executionOutcome('passando')).toBe('passou');
    expect(executionOutcome('falhando')).toBe('falhou');
    expect(executionOutcome('sem-cobertura')).toBe('sem-execucao');
  });
});

describe('summarizeStatuses', () => {
  it('conta e calcula o percentual passando', () => {
    const s = summarizeStatuses(['passando', 'passando', 'falhando', 'pendente']);
    expect(s).toMatchObject({ total: 4, passando: 2, falhando: 1, pendente: 1, semExecucao: 0 });
    expect(s.percentualPassando).toBe(50);
  });
  it('lista vazia tem 0%', () => {
    expect(summarizeStatuses([]).percentualPassando).toBe(0);
  });
});

describe('buildCoverageMatrix (RF-15)', () => {
  const rules = [
    {
      ruleId: 'RN-CUP-001',
      featureKey: 'cupons',
      featureName: 'Cupons',
      stacks: ['flutter', 'typescript', 'java'] as const,
    },
    {
      ruleId: 'RN-CUP-003',
      featureKey: 'cupons',
      featureName: 'Cupons',
      stacks: ['typescript', 'java'] as const,
    },
    {
      ruleId: 'RN-CHK-001',
      featureKey: 'checkout',
      featureName: 'Checkout',
      stacks: ['flutter'] as const,
    },
  ];

  it('conta regras cobertas por stack sobre o total da funcionalidade', () => {
    const matrix = buildCoverageMatrix([...rules], ['flutter', 'typescript', 'java']);
    const cupons = matrix.find((r) => r.featureKey === 'cupons');
    expect(cupons?.total).toBe(2);
    expect(cupons?.cells.map((c) => [c.stack, c.covered])).toEqual([
      ['flutter', 1],
      ['typescript', 2],
      ['java', 2],
    ]);
    expect(cupons?.cells[1]?.complete).toBe(true);
    expect(cupons?.cells[0]?.complete).toBe(false);
  });
});

describe('findDivergences (RF-16)', () => {
  it('lista regras presentes em uma stack e ausentes em outra do mesmo projeto', () => {
    const rules = [
      {
        ruleId: 'RN-CUP-003',
        featureKey: 'cupons',
        featureName: 'Cupons',
        stacks: ['typescript', 'java'] as const,
      },
      {
        ruleId: 'RN-CUP-001',
        featureKey: 'cupons',
        featureName: 'Cupons',
        stacks: ['flutter', 'typescript', 'java'] as const,
      },
    ];
    const divs = findDivergences([...rules], ['flutter', 'typescript', 'java']);
    expect(divs).toHaveLength(1);
    expect(divs[0]).toMatchObject({ ruleId: 'RN-CUP-003', missingIn: ['flutter'] });
  });
  it('regra presente em todas as stacks não é divergência', () => {
    const rules = [
      { ruleId: 'RN-X-1', featureKey: 'x', featureName: 'X', stacks: ['flutter', 'java'] as const },
    ];
    expect(findDivergences([...rules], ['flutter', 'java'])).toEqual([]);
  });
});

import { worstRuleStatus, worstScenarioResult } from '../src/index.js';

describe('worstScenarioResult', () => {
  it('pior resultado vence entre linhas de exemplo', () => {
    expect(worstScenarioResult(['passou', 'falhou'])).toBe('falhou');
    expect(worstScenarioResult(['passou', 'passou'])).toBe('passou');
    expect(worstScenarioResult([])).toBe('sem-execucao');
  });
});

describe('worstRuleStatus', () => {
  it('falhando vence entre stacks e sem-cobertura é ignorada', () => {
    expect(worstRuleStatus(['passando', 'falhando', 'sem-cobertura'])).toBe('falhando');
    expect(worstRuleStatus(['passando', 'sem-cobertura'])).toBe('passando');
    expect(worstRuleStatus(['sem-cobertura'])).toBe('sem-cobertura');
  });
});
