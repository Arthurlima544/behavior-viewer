import type { Matrix } from '../api/types';
import { StackIcon } from './StackIcon';
import styles from './CoverageMatrix.module.css';

/** Matriz funcionalidade × stack. Lacunas usam forma tracejada e texto x/y, não só cor (RF-25). */
export function CoverageMatrix({ matriz }: { matriz: Matrix }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.th}>
              Funcionalidade
            </th>
            {matriz.stacks.map((s) => (
              <th key={s.id} scope="col" className={styles.th}>
                <span className={styles.head}>
                  <StackIcon stack={s.id} size={14} />
                  {s.rotulo}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.linhas.map((linha) => (
            <tr key={linha.funcionalidadeKey}>
              <th scope="row" className={styles.rowHead}>
                {linha.funcionalidadeNome}
                <span className={`mono ${styles.total}`}>{linha.total}</span>
              </th>
              {linha.celulas.map((c) => (
                <td key={c.stack} className={styles.td}>
                  {c.complete ? (
                    <span className={`mono ${styles.ok}`}>
                      <span className={styles.okDot} aria-hidden="true" />
                      <span aria-label={`${c.covered} de ${c.total} regras cobertas`}>{c.covered}</span>
                    </span>
                  ) : (
                    <span className={`mono ${styles.gap}`} aria-label={`${c.covered} de ${c.total} regras cobertas, com lacuna`}>
                      {c.covered}/{c.total}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
