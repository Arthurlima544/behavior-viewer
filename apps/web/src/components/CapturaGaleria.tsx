import type { Captura } from '../api/types';
import styles from './CapturaGaleria.module.css';

/** Capturas de tela de um cenário, tiradas durante a execução dos testes (docs/prompts, seção 3). */
export function CapturaGaleria({ capturas }: { capturas: Captura[] }) {
  if (capturas.length === 0) return null;
  return (
    <ul className={styles.grid} aria-label="Capturas de tela da execução">
      {capturas.map((c, i) => (
        <li key={`${c.arquivo}-${i}`} className={styles.item}>
          <a href={c.url} target="_blank" rel="noreferrer" className={styles.link} aria-label={`Abrir captura: ${c.passo}`}>
            <img src={c.url} alt={`Tela durante o passo: ${c.passo}`} loading="lazy" className={styles.img} />
          </a>
          <span className={styles.caption}>{c.passo}</span>
          {c.tela ? <span className={`mono ${styles.tela}`}>{c.tela}</span> : null}
        </li>
      ))}
    </ul>
  );
}
