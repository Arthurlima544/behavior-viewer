import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { RuleSummary, Stack } from '../api/types';
import { StatusDot } from './StatusDot';
import { StackBadge } from './StackBadge';
import { Tag } from './Tag';
import { MarcacaoChip } from './MarcacaoChip';
import { plural, STATUS_LABEL } from '../lib/format';
import { rotas } from '../lib/paths';
import styles from './RuleRow.module.css';

interface Props {
  projetoId: string;
  regra: RuleSummary;
  stacks: Stack[];
}

/** Linha de regra: status, ID, título, tags, presença por stack e cenários (RF-29). */
export function RuleRow({ projetoId, regra, stacks }: Props) {
  const presentes = regra.presenca.filter((p) => p.presente).map((p) => p.rotulo);
  return (
    <Link to={rotas.regra(projetoId, regra.id)} className={styles.row} aria-label={`${regra.id}: ${regra.titulo}, ${STATUS_LABEL[regra.status]}`}>
      <span className={styles.dot}>
        <StatusDot status={regra.status} />
      </span>
      <span className={`mono ${styles.id}`}>{regra.id}</span>
      <MarcacaoChip marcacao={regra.marcacao} />
      <span className={styles.main}>
        <span className={styles.title}>{regra.titulo}</span>
        <span className={styles.tags}>
          {regra.tags.slice(0, 4).map((t) => (
            <Tag key={t}>{t.startsWith('@') ? t : `@${t}`}</Tag>
          ))}
          {regra.origem !== 'tag' ? <span className={styles.origem}>{origemLabel(regra.origem)}</span> : null}
        </span>
      </span>
      <span className={styles.badges} title={`Presente em: ${presentes.join(', ') || 'nenhuma stack'}`}>
        {stacks.map((s) => {
          const p = regra.presenca.find((x) => x.stack === s);
          return <StackBadge key={s} stack={s} active={Boolean(p?.presente)} size="sm" />;
        })}
      </span>
      <span className={`mono ${styles.cenarios}`}>{plural(regra.cenarios, 'cenário', 'cenários')}</span>
      <ChevronRight size={16} strokeWidth={1.5} className={styles.chevron} aria-hidden="true" />
    </Link>
  );
}

function origemLabel(origem: string): string {
  switch (origem) {
    case 'titulo':
    case 'provisorio':
      return 'sem ID';
    case 'implicita':
      return 'implícita';
    default:
      return origem;
  }
}
