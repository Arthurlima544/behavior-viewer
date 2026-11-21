import type { RuleDetail } from '../api/types';
import { StackIcon } from './StackIcon';
import { StatusChip } from './StatusChip';
import { RESULT_LABEL, STATUS_LABEL, plural, tempoRelativo } from '../lib/format';
import styles from './ImplementationCard.module.css';

type Impl = RuleDetail['implementacoes'][number];

/** Cartão "Onde a regra está": uma stack, com arquivo, linha e estado (RF-37). */
export function ImplementationCard({ impl }: { impl: Impl }) {
  const falhando = impl.status === 'falhando';
  const pendente = impl.status === 'pendente';
  return (
    <article className={`${styles.card} ${falhando ? styles.failing : ''}`} aria-label={`${impl.rotulo}: ${STATUS_LABEL[impl.status]}`}>
      <div className={styles.head}>
        <span className={styles.label}>
          <span className={styles.icon}>
            <StackIcon stack={impl.stack} size={16} />
          </span>
          <span className={styles.names}>
            {impl.rotulo}
            <span className={styles.layer}>{impl.funcionalidade}</span>
          </span>
        </span>
        <StatusChip status={impl.status} texto={chipTexto(impl)} />
      </div>
      <span className={`mono ${styles.path}`}>
        {impl.arquivo}:{impl.linha}
      </span>
      <span className={styles.stepsLine}>
        {plural(impl.cenarios.length, 'cenário', 'cenários')} · {impl.runner}
        {impl.ultimaExecucao ? ` · última execução ${tempoRelativo(impl.ultimaExecucao)}` : ' · sem execução registrada'}
      </span>
      {pendente ? <span className={styles.note}>Há passos sem implementação (pendentes).</span> : null}
    </article>
  );
}

function chipTexto(impl: Impl): string {
  switch (impl.status) {
    case 'falhando':
      return `Falhando · ${impl.cenarios.filter((c) => c.resultado === 'passou').length}/${impl.cenarios.length}`;
    case 'passando':
      return `Passando · ${impl.cenarios.length}/${impl.cenarios.length}`;
    case 'pendente':
      return 'Pendente';
    default:
      return impl.cenarios.some((c) => c.resultado !== 'sem-execucao') ? RESULT_LABEL['sem-execucao'] : 'Sem execução';
  }
}
