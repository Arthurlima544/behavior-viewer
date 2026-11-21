import type { Execucao, Stack } from '../api/types';
import { StackIcon } from './StackIcon';
import { StatusDot } from './StatusDot';
import { STATUS_LABEL } from '../lib/format';
import styles from './StackRow.module.css';

interface Props {
  stack: Stack;
  rotulo: string;
  status: 'passando' | 'falhando' | 'pendente' | 'sem-execucao' | 'sem-cobertura';
  localizacao?: string;
  historico?: Execucao[];
  /** Quando a stack não tem a regra: mostra a ação de copiar o Gherkin. */
  onCopy?: () => void;
}

/** Faixa compacta de uma stack: logo, status, caminho e últimas execuções em uma linha. */
export function StackRow({ stack, rotulo, status, localizacao, historico, onCopy }: Props) {
  const ausente = !localizacao;
  return (
    <div className={`${styles.row} ${ausente ? styles.ausente : ''}`}>
      <span className={styles.logo} aria-hidden="true">
        <StackIcon stack={stack} size={16} />
      </span>
      <div className={styles.info}>
        <span className={styles.nome}>{rotulo}</span>
        {localizacao ? (
          <span className={`mono ${styles.path}`}>{localizacao}</span>
        ) : (
          <span className={styles.path}>sem cobertura nesta stack</span>
        )}
      </div>
      {ausente ? null : (
        <span className={styles.status} title={STATUS_LABEL[status]}>
          <StatusDot status={status} />
          {STATUS_LABEL[status]}
        </span>
      )}
      {historico && historico.length > 0 ? (
        <ol className={styles.cells} aria-label={`Execuções em ${rotulo}`}>
          {historico.map((e, i) => {
            const cls = e.status === 'passando' ? styles.passou : e.status === 'falhando' ? styles.falhou : e.status === 'pendente' ? styles.pendente : styles.vazio;
            return <li key={i} className={`${styles.cell} ${cls}`} title={STATUS_LABEL[e.status]} />;
          })}
        </ol>
      ) : null}
      {onCopy ? (
        <button type="button" className={styles.copy} onClick={onCopy}>
          Copiar Gherkin
        </button>
      ) : null}
    </div>
  );
}

