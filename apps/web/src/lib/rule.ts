import type { RuleDetail } from '../api/types';

export type Implementacao = RuleDetail['implementacoes'][number];

/**
 * Stack cujos cenários são exibidos: a primeira que tem capturas de tela, ou a primeira
 * stack quando nenhuma tem. Assim o foco fica nos cenários com imagem.
 */
export function principalDe(regra: RuleDetail): Implementacao | undefined {
  return regra.implementacoes.find((i) => i.cenarios.some((c) => c.capturas.length > 0)) ?? regra.implementacoes[0];
}
