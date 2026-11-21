import type { Execucao, RuleDetail, Stack } from '../api/types';
import { StackRow } from './StackRow';
import styles from './StackBanner.module.css';

interface Props {
  implementacoes: RuleDetail['implementacoes'];
  ausentes: RuleDetail['ausentes'];
  historico: RuleDetail['historico'];
  principal?: Stack;
  onCopy: (stack: string) => void;
}

/** Faixa única com uma linha por stack: presença, status, caminho e últimas execuções. */
export function StackBanner({ implementacoes, ausentes, historico, principal, onCopy }: Props) {
  const execucoes = (stack: Stack): Execucao[] | undefined => historico.find((h) => h.stack === stack)?.execucoes;
  return (
    <div className={styles.banner} aria-label="Stacks da regra">
      {implementacoes.map((i) => (
        <StackRow
          key={i.stack}
          stack={i.stack}
          rotulo={i.rotulo}
          status={i.status}
          localizacao={`${i.arquivo}:${i.linha}`}
          historico={execucoes(i.stack)}
        />
      ))}
      {ausentes.map((a) => (
        <StackRow
          key={a.stack}
          stack={a.stack}
          rotulo={a.rotulo}
          status="sem-cobertura"
          onCopy={() => onCopy(principal ?? a.stack)}
        />
      ))}
    </div>
  );
}
