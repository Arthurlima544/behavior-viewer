import { Link } from 'react-router-dom';
import type { ProjectSummary } from '../api/types';
import { STACK_LABEL, tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import { StackIcon } from './StackIcon';
import { StatusBar } from './StatusBar';
import styles from './ProjectCard.module.css';

export function ProjectCard({ projeto }: { projeto: ProjectSummary }) {
  const { contadores } = projeto;
  return (
    <Link to={rotas.catalogo(projeto.id)} className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleBox}>
          <span className={styles.name}>{projeto.nome}</span>
          <span className={styles.desc}>
            {projeto.descricao || projeto.stacks.map((s) => STACK_LABEL[s.id]).join(', ')}
          </span>
        </div>
        <div className={styles.stacks}>
          {projeto.stacks.map((s) => (
            <span key={s.id} title={STACK_LABEL[s.id]} className={styles.stackBox} aria-label={STACK_LABEL[s.id]} role="img">
              <StackIcon stack={s.id} />
            </span>
          ))}
        </div>
      </div>
      <div className={styles.counters}>
        <Counter value={contadores.regras} label="regras" />
        <Counter value={contadores.funcionalidades} label="funcionalidades" />
        <Counter value={contadores.cenarios} label="cenários" />
      </div>
      <StatusBar status={projeto.status} />
      <div className={`mono ${styles.footer}`}>
        <span>{projeto.ref ?? projeto.caminho}</span>
        <span>{tempoRelativo(projeto.sincronizadoEm)}</span>
      </div>
    </Link>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.counter}>
      <span className={styles.counterValue}>{value}</span>
      <span className={styles.counterLabel}>{label}</span>
    </div>
  );
}
