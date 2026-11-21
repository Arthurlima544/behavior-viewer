import type { StatusCounts } from '../api/types';
import styles from './StatusBar.module.css';

/** Barra segmentada de status com legenda (RF-24, RF-25). */
export function StatusBar({ status }: { status: StatusCounts }) {
  const total = status.total || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const pass = Math.round((status.passando / total) * 100);
  const pend = Math.round((status.pendente / total) * 100);
  const fail = Math.round((status.falhando / total) * 100);
  return (
    <div className={styles.wrap}>
      <div className={styles.bar} aria-hidden="true">
        <div style={{ width: pct(status.passando), background: 'var(--status-pass)' }} />
        <div style={{ width: pct(status.pendente), background: 'var(--status-pending)' }} />
        <div style={{ width: pct(status.falhando), background: 'var(--status-fail)' }} />
      </div>
      <div className={styles.legend}>
        <span className={styles.item}>
          <span className={styles.dotPass} />
          {pass}% passando
        </span>
        <span className={styles.item}>
          <span className={styles.dotPending} />
          {pend}% pendente
        </span>
        <span className={styles.item}>
          <span className={styles.dotFail} />
          {fail}% falhando
        </span>
      </div>
    </div>
  );
}
