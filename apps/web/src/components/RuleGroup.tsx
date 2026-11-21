import type { Stack } from '../api/types';
import { STATUS_LABEL, plural } from '../lib/format';
import type { GrupoFuncionalidade } from '../pages/CatalogPage';
import { RuleRow } from './RuleRow';
import styles from './RuleGroup.module.css';

interface Props {
  projetoId: string;
  grupo: GrupoFuncionalidade;
  stacks: Stack[];
}

/** Grupo de regras de uma funcionalidade, com resumo de status (RF-28). */
export function RuleGroup({ projetoId, grupo, stacks }: Props) {
  const c = grupo.contagem;
  const partes = [
    `${plural(grupo.regras.length, 'regra', 'regras')}`,
    c.passando ? `${c.passando} ${STATUS_LABEL.passando.toLowerCase()}` : null,
    c.pendente ? `${c.pendente} ${STATUS_LABEL.pendente.toLowerCase()}` : null,
    c.falhando ? `${c.falhando} ${STATUS_LABEL.falhando.toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <section className={styles.section} aria-labelledby={`grupo-${grupo.key}`}>
      <div className={styles.head}>
        <h2 id={`grupo-${grupo.key}`} className={styles.title}>
          {grupo.nome}
          {grupo.arquivo ? <span className={`mono ${styles.file}`}>{nomeArquivo(grupo.arquivo)}</span> : null}
        </h2>
        <span className={styles.summary}>{partes.join(' · ')}</span>
      </div>
      <div className={styles.list}>
        {grupo.regras.map((r) => (
          <RuleRow key={r.id} projetoId={projetoId} regra={r} stacks={stacks} />
        ))}
      </div>
    </section>
  );
}

function nomeArquivo(caminho: string): string {
  return caminho.split('/').pop() ?? caminho;
}
