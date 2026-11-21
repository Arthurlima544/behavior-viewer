import type { Candidato } from '../api/types';
import { STACK_LABEL, plural } from '../lib/format';
import { StackIcon } from './StackIcon';
import styles from './CandidateList.module.css';

interface Props {
  candidatos: Candidato[];
  selecionados: Set<string>;
  onToggle: (id: string) => void;
}

/** Projetos identificados em uma pasta, com seleção para registro (RF-01, RF-03). */
export function CandidateList({ candidatos, selecionados, onToggle }: Props) {
  return (
    <ul className={styles.list} aria-label="Projetos identificados">
      {candidatos.map((c) => {
        const disabled = c.jaRegistrado;
        return (
          <li key={c.id} className={`${styles.item} ${disabled ? styles.disabled : ''}`}>
            <label className={styles.row}>
              <input
                type="checkbox"
                className={styles.check}
                checked={selecionados.has(c.id)}
                disabled={disabled}
                onChange={() => onToggle(c.id)}
                aria-label={`Registrar ${c.nome}`}
              />
              <span className={styles.main}>
                <span className={styles.title}>
                  {c.nome}
                  {c.origem === 'config' ? <span className={styles.tag}>.behavior.yml</span> : null}
                  {disabled ? <span className={styles.tag}>já registrado</span> : null}
                </span>
                <span className={`mono ${styles.path}`}>{c.caminhoExibicao}</span>
                <span className={styles.meta}>
                  {plural(c.funcionalidades, 'funcionalidade', 'funcionalidades')} · {plural(c.cenarios, 'cenário', 'cenários')} ·{' '}
                  {plural(c.arquivos, 'arquivo .feature', 'arquivos .feature')}
                  {c.errosLeitura > 0 ? ` · ${c.errosLeitura} erro(s) de leitura` : ''}
                </span>
              </span>
              <span className={styles.stacks}>
                {c.stacks.map((s) => (
                  <span key={s} className={styles.stack} title={STACK_LABEL[s]}>
                    <StackIcon stack={s} size={14} />
                    {STACK_LABEL[s]}
                  </span>
                ))}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
