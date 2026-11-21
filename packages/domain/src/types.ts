/** Stacks de BDD reconhecidas pelo scanner (RF-04). */
export const STACKS = ['flutter', 'typescript', 'java', 'gherkin-generico'] as const;
export type Stack = (typeof STACKS)[number];

/** Resultado de um cenário em uma execução. */
export type ScenarioResult = 'passou' | 'falhou' | 'pendente' | 'sem-execucao';

/** Status de uma regra em uma stack, ou no agregado (RF-19). */
export type RuleStatus = 'passando' | 'falhando' | 'pendente' | 'sem-execucao' | 'sem-cobertura';

/** Como a regra foi identificada (RF-08 a RF-10, RF-14). */
export type RuleOrigin = 'tag' | 'titulo' | 'implicita' | 'provisorio';

export const STACK_LABEL: Record<Stack, string> = {
  flutter: 'Flutter',
  typescript: 'TypeScript',
  java: 'Java',
  'gherkin-generico': 'Gherkin',
};
