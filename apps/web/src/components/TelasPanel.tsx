import type { ComponenteRef, TelaRef } from '../api/types';
import styles from './TelasPanel.module.css';

/** Telas e componentes ligados à regra, pela tag @tela- ou pela rota citada num passo (docs/prompts, seção 2). */
export function TelasPanel({ telas, componentes }: { telas: TelaRef[]; componentes: ComponenteRef[] }) {
  return (
    <section className={styles.box} aria-labelledby="telas-titulo">
      <h2 id="telas-titulo" className={styles.title}>
        Tela e componentes
      </h2>
      {telas.length === 0 ? (
        <p className={styles.hint}>
          Nenhuma tela identificada. Adicione <span className="mono">@tela-</span> à funcionalidade ou cite a rota de uma tela
          declarada em um passo.
        </p>
      ) : (
        <ul className={styles.list}>
          {telas.map((t) => (
            <li key={t.nome} className={styles.tela}>
              <span className={styles.nome}>{t.nome}</span>
              {t.rota ? <span className={`mono ${styles.rota}`}>{t.rota}</span> : null}
              <span className={styles.origem}>{t.origem === 'tag' ? 'pela tag' : 'pela rota no passo'}</span>
              {t.arquivo ? <span className={`mono ${styles.arquivo}`}>{t.arquivo}</span> : null}
              {!t.declarada ? <span className={styles.aviso}>não declarada no .behavior.yml</span> : null}
            </li>
          ))}
        </ul>
      )}
      {componentes.length > 0 ? (
        <div className={styles.componentes} aria-label="Componentes">
          {componentes.map((c) => (
            <span key={c.nome} className={styles.chip} title={c.arquivo ?? undefined}>
              {c.nome}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
