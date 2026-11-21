import type { Stack } from '../api/types';
import { STACK_LABEL } from '../lib/format';
import { StackIcon } from './StackIcon';
import styles from './StackBadge.module.css';

interface Props {
  stack: Stack;
  active: boolean;
  /** Mostra o rótulo ao lado do ícone (ex.: "Flutter · app"). */
  label?: string;
  size?: 'sm' | 'md';
}

/** Badge de stack: presente (borda sólida) ou ausente (tracejada) — RF-29. */
export function StackBadge({ stack, active, label, size = 'md' }: Props) {
  const name = STACK_LABEL[stack];
  const text = active ? `${name}: presente` : `${name}: ausente`;
  return (
    <span
      className={`${styles.badge} ${active ? styles.active : styles.inactive} ${size === 'sm' ? styles.sm : ''}`}
      title={text}
      role="img"
      aria-label={text}
    >
      <StackIcon stack={stack} size={size === 'sm' ? 14 : 16} />
      {label ? <span className={styles.label}>{label}</span> : null}
    </span>
  );
}
