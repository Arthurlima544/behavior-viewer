import type { Cenario } from '../api/types';
import { ehPalavraChave, RESULT_LABEL, TIPO_LABEL } from '../lib/format';
import { StatusDot } from './StatusDot';
import styles from './ScenarioCard.module.css';

interface Props {
  cenario: Cenario;
  modo: 'gherkin' | 'texto';
}

/**
 * Cenário do detalhe: passos à esquerda, capturas de tela ao lado (compactas, para caber
 * vários cenários na mesma tela). Sem captura, os passos ocupam a largura toda.
 */
export function ScenarioCard({ cenario, modo }: Props) {
  const comCapturas = cenario.capturas.length > 0;
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
      <div className={`${styles.body} ${comCapturas ? styles.comCapturas : ''}`}>
        <div className={`mono ${styles.steps}`}>
          {cenario.passos.map((p, i) => (
            <div key={i} className={styles.step}>
              {modo === 'gherkin' ? (
                <span className={ehPalavraChave(p.palavra) && p.palavra !== 'E' && p.palavra !== 'And' ? styles.kw : styles.kwMuted}>
                  {p.palavra}
                </span>
              ) : null}
              <span className={styles.text}>{modo === 'texto' ? capitaliza(p.texto) : p.texto}</span>
            </div>
          ))}
          {cenario.exemplos.length > 0 ? (
            <table className={styles.exemplos}>
              <tbody>
                {cenario.exemplos.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((c, j) => (i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        {comCapturas ? (
          <ul className={styles.capturas} aria-label="Capturas de tela da execução">
            {cenario.capturas.map((c, i) => (
              <li key={`${c.arquivo}-${i}`} className={styles.captura}>
                <a href={c.url} target="_blank" rel="noreferrer" aria-label={`Abrir captura: ${c.passo}`}>
                  <img src={c.url} alt={`Tela durante o passo: ${c.passo}`} loading="lazy" className={styles.img} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function capitaliza(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
