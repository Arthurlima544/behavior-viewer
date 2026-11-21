import { useProjetos } from '../api/queries';
import { plural } from '../lib/format';
import { useSincronizar } from '../lib/sync';
import { Button } from './Button';
import styles from './PendenciasAlert.module.css';

/**
 * Alerta de mudanças detectadas nos testes BDD. Os dados da tela só mudam quando o usuário
 * clica em Sincronizar: enquanto isso, o alerta fica visível.
 */
export function PendenciasAlert() {
  const projetos = useProjetos();
  const { sincronizar, sincronizando } = useSincronizar();
  const comPendencias = (projetos.data ?? []).filter((p) => p.pendencias);
  if (comPendencias.length === 0) return null;

  const total = comPendencias.reduce(
    (s, p) => s + (p.pendencias?.novos.length ?? 0) + (p.pendencias?.alterados.length ?? 0) + (p.pendencias?.removidos.length ?? 0),
    0,
  );
  const nomes = comPendencias.map((p) => p.nome).join(', ');

  return (
    <section className={styles.alerta} role="status" aria-label="Alterações nos testes BDD">
      <div className={styles.texto}>
        <span className={styles.titulo}>Alterações identificadas nos testes BDD</span>
        <span className={styles.detalhe}>
          {plural(total, 'arquivo mudou', 'arquivos mudaram')} em {nomes}. Clique em Sincronizar para atualizar os projetos com as novas
          regras e cenários.
        </span>
      </div>
      <Button variant="primary" disabled={sincronizando} onClick={() => void sincronizar()}>
        {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
      </Button>
    </section>
  );
}
