import type { RuleStatus, ScenarioResult } from '../api/types';
import { RESULT_LABEL, STATUS_LABEL } from '../lib/format';
import styles from './StatusDot.module.css';

type Value = RuleStatus | ScenarioResult;

const VISUAL: Record<Value, { cls: string; text: string }> = {
  passando: { cls: styles.pass, text: STATUS_LABEL.passando },
  passou: { cls: styles.pass, text: RESULT_LABEL.passou },
  falhando: { cls: styles.fail, text: STATUS_LABEL.falhando },
  falhou: { cls: styles.fail, text: RESULT_LABEL.falhou },
  pendente: { cls: styles.pending, text: STATUS_LABEL.pendente },
  'sem-execucao': { cls: styles.none, text: STATUS_LABEL['sem-execucao'] },
  'sem-cobertura': { cls: styles.none, text: STATUS_LABEL['sem-cobertura'] },
};

/**
 * Ponto de status: passando sólido, falhando vermelho, pendente em anel e sem execução
 * tracejado. A forma acompanha a cor, por RNF-08.
 */
export function StatusDot({ status }: { status: Value }) {
  const v = VISUAL[status];
  return <span className={`${styles.dot} ${v.cls}`} title={v.text} role="img" aria-label={v.text} />;
}
