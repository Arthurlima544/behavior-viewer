import type { RuleDetail } from '../api/types';
import { RESULT_LABEL } from '../lib/format';
import styles from './RunHistoryStrip.module.css';

type Execucao = RuleDetail['historico'][number]['execucoes'][number];

/** Faixa das últimas 14 execuções de uma stack. Cada célula tem texto e forma, não só cor (RF-39). */
export function RunHistoryStrip({ rotulo, execucoes }: { rotulo: string; execucoes: Execucao[] }) {
  return (
    <div className={styles.row}>
      <span className={`mono ${styles.label}`}>{rotulo}</span>
      <ol className={styles.cells} aria-label={`Execuções em ${rotulo}`}>
        {execucoes.map((e, i) => {
          const texto = textoCelula(e);
          return (
            <li
              key={`${i}-${e.executadoEm ?? 'x'}`}
              title={texto}
              aria-label={texto}
              className={`${styles.cell} ${styles[celulaClasse(e)]}`}
            />
          );
        })}
      </ol>
    </div>
  );
}

function celulaClasse(e: Execucao): 'passou' | 'falhou' | 'pendente' | 'vazio' {
  switch (e.status) {
    case 'passando':
      return 'passou';
    case 'falhando':
      return 'falhou';
    case 'pendente':
      return 'pendente';
    default:
      return 'vazio';
  }
}

function textoCelula(e: Execucao): string {
  const r = celulaClasse(e);
  if (r === 'passou') return RESULT_LABEL.passou;
  if (r === 'falhou') return RESULT_LABEL.falhou;
  if (r === 'pendente') return 'Pendente';
  return RESULT_LABEL['sem-execucao'];
}

