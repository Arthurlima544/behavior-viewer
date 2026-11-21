import type { ReactNode } from 'react';
import styles from './States.module.css';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.box} role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function ErrorState({ mensagem, onRetry }: { mensagem: string; onRetry?: () => void }) {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.title}>Não foi possível carregar os dados.</p>
      <p className={styles.text}>{mensagem}</p>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

/** Estado vazio com o próximo passo (RF-52). */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.box}>
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.text}>{children}</div> : null}
    </div>
  );
}
