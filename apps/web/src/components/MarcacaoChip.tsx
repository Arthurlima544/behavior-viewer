import type { Marcacao } from '../api/types';
import styles from './MarcacaoChip.module.css';

/** Selo de novidade: NOVO (preenchido) ou ALTERADO (contornado). Texto e forma, não só cor. */
export function MarcacaoChip({ marcacao }: { marcacao: Marcacao }) {
  if (!marcacao) return null;
  return (
    <span
      className={`${styles.chip} ${marcacao === 'novo' ? styles.novo : styles.alterado}`}
      title={marcacao === 'novo' ? 'Regra nova desde a última visualização' : 'Alterada desde a última visualização'}
    >
      {marcacao === 'novo' ? 'NOVO' : 'ALTERADO'}
    </span>
  );
}
