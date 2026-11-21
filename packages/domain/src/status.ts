import type { RuleStatus, ScenarioResult } from './types.js';

/**
 * Status de uma regra em uma stack a partir dos resultados dos seus cenários (RF-19).
 * Prioridade: falhando > pendente > sem-execucao > passando.
 * Sem nenhum cenário com resultado, a regra fica como sem-execucao.
 */
export function aggregateStatus(results: readonly ScenarioResult[]): RuleStatus {
  if (results.length === 0) return 'sem-execucao';
  if (results.includes('falhou')) return 'falhando';
  if (results.includes('pendente')) return 'pendente';
  if (results.includes('sem-execucao')) return 'sem-execucao';
  return 'passando';
}

/** Resultado de uma execução de regra (cenários agregados) para o histórico (RF-20). */
export function executionOutcome(status: RuleStatus): ScenarioResult {
  switch (status) {
    case 'passando':
      return 'passou';
    case 'falhando':
      return 'falhou';
    case 'pendente':
      return 'pendente';
    default:
      return 'sem-execucao';
  }
}

export interface StatusCounts {
  total: number;
  passando: number;
  pendente: number;
  falhando: number;
  semExecucao: number;
  /** Percentual de regras passando, arredondado (RF-23). 0 quando não há regras. */
  percentualPassando: number;
}

/** Conta regras por status para barras e indicadores (RF-23, RF-24). */
export function summarizeStatuses(statuses: readonly RuleStatus[]): StatusCounts {
  const counts: StatusCounts = {
    total: statuses.length,
    passando: 0,
    pendente: 0,
    falhando: 0,
    semExecucao: 0,
    percentualPassando: 0,
  };
  for (const s of statuses) {
    if (s === 'passando') counts.passando++;
    else if (s === 'pendente') counts.pendente++;
    else if (s === 'falhando') counts.falhando++;
    else counts.semExecucao++;
  }
  counts.percentualPassando =
    counts.total === 0 ? 0 : Math.round((counts.passando / counts.total) * 100);
  return counts;
}

/** Rótulo em pt-BR para status (usado em títulos e acessibilidade). */
export const STATUS_LABEL: Record<RuleStatus, string> = {
  passando: 'Passando',
  falhando: 'Falhando',
  pendente: 'Pendente',
  'sem-execucao': 'Sem execução',
  'sem-cobertura': 'Sem cobertura',
};

/** Pior resultado entre linhas de exemplo de um mesmo cenário (ex.: Scenario Outline). */
export function worstScenarioResult(results: readonly ScenarioResult[]): ScenarioResult {
  if (results.length === 0) return 'sem-execucao';
  if (results.includes('falhou')) return 'falhou';
  if (results.includes('pendente')) return 'pendente';
  if (results.includes('sem-execucao')) return 'sem-execucao';
  return 'passou';
}

/**
 * Pior status entre implementações de uma mesma regra (ex.: uma stack falhando e outra passando
 * resulta em falhando). `sem-cobertura` não entra no cálculo, pois ausência não é falha.
 */
export function worstRuleStatus(statuses: readonly RuleStatus[]): RuleStatus {
  const present = statuses.filter((s) => s !== 'sem-cobertura');
  if (present.length === 0) return 'sem-cobertura';
  if (present.includes('falhando')) return 'falhando';
  if (present.includes('pendente')) return 'pendente';
  if (present.includes('sem-execucao')) return 'sem-execucao';
  return 'passando';
}
