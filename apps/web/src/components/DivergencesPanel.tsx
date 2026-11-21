import { Link } from 'react-router-dom';
import type { Divergence } from '../api/types';
import { plural } from '../lib/format';
import { rotas } from '../lib/paths';
import styles from './DivergencesPanel.module.css';

interface Props {
  projetoId: string;
  divergencias: Divergence[];
}

/** Painel de divergências: texto gerado a partir dos dados, não escrito à mão (RF-26). */
export function DivergencesPanel({ projetoId, divergencias }: Props) {
  const grupos = agrupa(divergencias);
  return (
    <aside className={styles.panel} aria-label="Divergências">
      <span className={styles.eyebrow}>Divergências</span>
      {grupos.length === 0 ? (
        <p className={styles.text}>Nenhuma divergência entre as stacks deste projeto.</p>
      ) : (
        grupos.map((g) => (
          <p key={g.chave} className={styles.text}>
            {plural(g.total, 'regra', 'regras')} de <strong>{g.funcionalidade}</strong>{' '}
            {g.total === 1 ? 'existe' : 'existem'} em {g.presentes.join(' e ')}, mas {g.total === 1 ? 'não tem cenário' : 'não têm cenário'} em{' '}
            {g.ausentes.join(', ')}.
          </p>
        ))
      )}
      {divergencias.length > 0 ? (
        <Link to={rotas.catalogo(projetoId, { divergentes: 'true' })} className={styles.link}>
          Ver regras afetadas
        </Link>
      ) : null}
    </aside>
  );
}

function agrupa(items: Divergence[]) {
  const map = new Map<string, { chave: string; funcionalidade: string; presentes: string[]; ausentes: string[]; total: number }>();
  for (const d of items) {
    const chave = `${d.funcionalidadeKey}|${d.rotuloPresentes.join(',')}|${d.rotuloAusentes.join(',')}`;
    const atual = map.get(chave) ?? {
      chave,
      funcionalidade: d.funcionalidadeNome,
      presentes: d.rotuloPresentes,
      ausentes: d.rotuloAusentes,
      total: 0,
    };
    atual.total++;
    map.set(chave, atual);
  }
  return [...map.values()];
}
