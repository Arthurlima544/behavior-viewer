import type { Cenario } from '../api/types';
import { ehPalavraChave, RESULT_LABEL, TIPO_LABEL } from '../lib/format';
import { StatusDot } from './StatusDot';
import styles from './ScenarioCard.module.css';

interface Props {
  cenario: Cenario;
  modo: 'gherkin' | 'texto';
  /** Rótulo da stack de onde vêm os passos (ex.: "Flutter"). */
  stackRotulo?: string;
  /** Tamanho do texto: 'normal' no detalhe, 'grande' na apresentação. */
  escala?: 'normal' | 'grande';
}

/**
 * Cenário com os passos à esquerda e as capturas de tela ao lado. Sem captura, os passos
 * ocupam a largura toda.
 */
export function ScenarioCard({ cenario, modo, stackRotulo, escala = 'normal' }: Props) {
  const comCapturas = cenario.capturas.length > 0;
  return (
    <article className={`${styles.card} ${escala === 'grande' ? styles.grande : ''}`}>
      <header className={styles.head}>
        <span className={styles.name}>
          <span className="sr-only">{TIPO_LABEL[cenario.tipo]}: </span>
          {cenario.nome}
        </span>
        <span className={styles.meta}>
          {stackRotulo ? <span className={styles.stack}>{stackRotulo}</span> : null}
          <span className={styles.result}>
            <StatusDot status={cenario.resultado} />
            {RESULT_LABEL[cenario.resultado]}
          </span>
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
                <span className={styles.legenda}>{c.passo}</span>
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
