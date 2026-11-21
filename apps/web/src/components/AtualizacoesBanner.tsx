import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { keys } from '../api/queries';
import type { ProjectSummary } from '../api/types';
import { plural, tempoRelativo } from '../lib/format';
import { Button } from './Button';
import styles from './AtualizacoesBanner.module.css';

/**
 * Aviso de atualizações na pasta de testes do projeto (SHA-256 da pasta). Fica até o usuário
 * marcar o projeto como visto, para que nenhuma mudança de regra passe despercebida.
 */
export function AtualizacoesBanner({ projeto }: { projeto: ProjectSummary }) {
  const a = projeto.atualizacoes;
  const queryClient = useQueryClient();
  const visto = useMutation({
    mutationFn: () => api.marcarVisto(projeto.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.projetos });
      await queryClient.invalidateQueries({ queryKey: keys.visao });
    },
  });
  if (!a.pendentes) return null;

  const partes = [
    a.novos.length > 0 ? `${plural(a.novos.length, 'arquivo novo', 'arquivos novos')}` : null,
    a.alterados.length > 0 ? `${plural(a.alterados.length, 'alterado', 'alterados')}` : null,
    a.removidos.length > 0 ? `${plural(a.removidos.length, 'removido', 'removidos')}` : null,
  ].filter(Boolean);
  const variacao =
    a.antes && (a.antes.regras !== a.agora.regras || a.antes.cenarios !== a.agora.cenarios)
      ? `regras ${a.antes.regras} → ${a.agora.regras} · cenários ${a.antes.cenarios} → ${a.agora.cenarios}`
      : null;

  return (
    <section className={styles.banner} role="status" aria-label={`Atualizações em ${projeto.nome}`}>
      <div className={styles.texto}>
        <span className={styles.titulo}>
          Atualizações em <strong>{projeto.nome}</strong>: {partes.join(', ')}
        </span>
        <span className={styles.meta}>
          {variacao ? <span>{variacao} · </span> : null}
          <span className="mono">{a.assinatura}</span>
          {a.vistoEm ? <span> · visto {tempoRelativo(a.vistoEm)}</span> : null}
        </span>
        <details className={styles.detalhes}>
          <summary>Ver arquivos</summary>
          <ul>
            {a.novos.map((f) => (
              <li key={`n-${f}`}><span className={styles.novo}>novo</span> <span className="mono">{f}</span></li>
            ))}
            {a.alterados.map((f) => (
              <li key={`a-${f}`}><span className={styles.alterado}>alterado</span> <span className="mono">{f}</span></li>
            ))}
            {a.removidos.map((f) => (
              <li key={`r-${f}`}><span className={styles.removido}>removido</span> <span className="mono">{f}</span></li>
            ))}
          </ul>
        </details>
      </div>
      <Button variant="outline" disabled={visto.isPending} onClick={() => visto.mutate()}>
        {visto.isPending ? 'Marcando…' : 'Marcar como visto'}
      </Button>
    </section>
  );
}
