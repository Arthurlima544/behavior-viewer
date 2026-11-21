import type { RuleStatus } from '../api/types';
import { StatusDot } from './StatusDot';
import styles from './StatusChip.module.css';

interface Props {
  status: RuleStatus;
  texto: string;
}

/** Pílula de status com ponto e texto (docs/design §3, StatusChip). */
export function StatusChip({ status, texto }: Props) {
  const failing = status === 'falhando';
  return (
    <span className={`${styles.chip} ${failing ? styles.fail : ''}`}>
      <StatusDot status={status} />
      {texto}
    </span>
  );
}
