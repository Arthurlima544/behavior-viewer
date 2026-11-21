import type { Feature } from '../api/types';
import styles from './FeatureNav.module.css';

interface Props {
  items: Feature[];
  ativa: string;
  onSelect: (key: string) => void;
}

/** Lista de funcionalidades do projeto, com contagem de regras (RF-27). */
export function FeatureNav({ items, ativa, onSelect }: Props) {
  return (
    <nav aria-label="Funcionalidades" className={styles.nav}>
      <div className={styles.label}>Funcionalidades</div>
      {ativa ? (
        <button type="button" className={styles.clear} onClick={() => onSelect('')}>
          Ver todas
        </button>
      ) : null}
      {items.map((f) => (
        <button
          key={f.key}
          type="button"
          aria-current={f.key === ativa ? 'true' : undefined}
          className={`${styles.item} ${f.key === ativa ? styles.active : ''}`}
          onClick={() => onSelect(f.key)}
        >
          <span className={styles.name}>{f.nome}</span>
          <span className={`mono ${styles.count}`}>{f.regras}</span>
        </button>
      ))}
    </nav>
  );
}
