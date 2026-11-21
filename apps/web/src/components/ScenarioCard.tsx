import type { Cenario } from '../api/types';
import { ehPalavraChave, RESULT_LABEL, TIPO_LABEL } from '../lib/format';
import { StatusDot } from './StatusDot';
import styles from './ScenarioCard.module.css';

interface Props {
  cenario: Cenario;
  modo: 'gherkin' | 'texto';
}

/** Cartão de cenário com alternância Gherkin / Texto simples (RF-35). */
export function ScenarioCard({ cenario, modo }: Props) {
  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <span className={styles.name}>
          <span className="sr-only">{TIPO_LABEL[cenario.tipo]}: </span>
          {cenario.nome}
        </span>
        <span className={styles.result}>
          <StatusDot status={cenario.resultado} />
          {RESULT_LABEL[cenario.resultado]}
        </span>
      </header>
      <div className={`mono ${styles.body}`}>
        {cenario.passos.map((p, i) => (
          <div key={i} className={styles.step}>
            {modo === 'gherkin' ? (
              <span className={ehPalavraChave(p.palavra) && p.palavra !== 'E' && p.palavra !== 'And' ? styles.kw : styles.kwMuted}>
                {p.palavra}
              </span>
            ) : null}
            <span className={styles.text}>{modo === 'texto' ? textoSimples(p.texto) : p.texto}</span>
          </div>
        ))}
        {cenario.exemplos.length > 0 ? (
          <div className={styles.examples}>
            <span className={styles.exTitle}>Exemplos</span>
            <table>
              <tbody>
                {cenario.exemplos.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((c, j) =>
                      i === 0 ? (
                        <th key={j}>{c}</th>
                      ) : (
                        <td key={j}>{c}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function textoSimples(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
