import type { Stack } from './types.js';

/** Uma regra consolidada, reduzida ao que a matriz e as divergências precisam (RF-15, RF-16). */
export interface CoverageRuleInput {
  ruleId: string;
  featureKey: string;
  featureName: string;
  /** Stacks em que a regra tem implementação. */
  stacks: readonly Stack[];
}

export interface MatrixCell {
  stack: Stack;
  covered: number;
  total: number;
  complete: boolean;
}

export interface MatrixRow {
  featureKey: string;
  featureName: string;
  total: number;
  cells: MatrixCell[];
}

const STACK_ORDER: Stack[] = ['flutter', 'typescript', 'java', 'gherkin-generico'];

/** Ordena stacks na ordem canônica do design (Flutter, TypeScript, Java). */
export function orderStacks(stacks: Iterable<Stack>): Stack[] {
  const set = new Set(stacks);
  return STACK_ORDER.filter((s) => set.has(s));
}

/**
 * Matriz funcionalidade × stack (RF-15). Para cada funcionalidade, o total é o número
 * de regras distintas e cada célula conta quantas dessas regras estão cobertas na stack.
 */
export function buildCoverageMatrix(
  rules: readonly CoverageRuleInput[],
  projectStacks: readonly Stack[]
): MatrixRow[] {
  const stacks = orderStacks(projectStacks);
  const byFeature = new Map<string, { name: string; rules: CoverageRuleInput[] }>();
  for (const rule of rules) {
    const entry = byFeature.get(rule.featureKey) ?? { name: rule.featureName, rules: [] };
    entry.rules.push(rule);
    byFeature.set(rule.featureKey, entry);
  }

  return [...byFeature.entries()]
    .map(([featureKey, { name, rules: featureRules }]) => ({
      featureKey,
      featureName: name,
      total: featureRules.length,
      cells: stacks.map((stack) => {
        const covered = featureRules.filter((r) => r.stacks.includes(stack)).length;
        return {
          stack,
          covered,
          total: featureRules.length,
          complete: covered === featureRules.length,
        };
      }),
    }))
    .sort((a, b) => a.featureName.localeCompare(b.featureName, 'pt-BR'));
}

export interface Divergence {
  ruleId: string;
  featureKey: string;
  featureName: string;
  presentIn: Stack[];
  missingIn: Stack[];
}

/**
 * Divergências (RF-16): regra presente em pelo menos uma stack do projeto e ausente
 * em outra stack do mesmo projeto.
 */
export function findDivergences(
  rules: readonly CoverageRuleInput[],
  projectStacks: readonly Stack[]
): Divergence[] {
  const stacks = orderStacks(projectStacks);
  const result: Divergence[] = [];
  for (const rule of rules) {
    const present = stacks.filter((s) => rule.stacks.includes(s));
    const missing = stacks.filter((s) => !rule.stacks.includes(s));
    if (present.length > 0 && missing.length > 0) {
      result.push({
        ruleId: rule.ruleId,
        featureKey: rule.featureKey,
        featureName: rule.featureName,
        presentIn: present,
        missingIn: missing,
      });
    }
  }
  return result;
}
