import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { keys, useProjetos } from '../api/queries';
import type { ProjectSummary } from '../api/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { ButtonLink, Button } from '../components/Button';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { StackIcon } from '../components/StackIcon';
import { plural, STACK_LABEL, tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import pageStyles from './Page.module.css';
import styles from './ProjectsPage.module.css';

/** Projetos registrados, com identificação de stacks, funcionalidades e testes (RF-02, RF-03). */
export function ProjectsPage() {
  const projetos = useProjetos();
  const location = useLocation();
  const mensagem = (location.state as { mensagem?: string } | null)?.mensagem;

  if (projetos.isError) return <ErrorState mensagem={(projetos.error as Error).message} onRetry={() => projetos.refetch()} />;
  if (!projetos.data) return <Loading />;
  const lista = projetos.data;

  return (
    <>
      <header className={pageStyles.header}>
        <div className={pageStyles.titleBox}>
          <Breadcrumb items={[{ label: 'Projetos', to: rotas.visaoGeral() }, { label: 'Gerenciar' }]} />
          <h1 className={pageStyles.title}>Projetos</h1>
          <p className={pageStyles.subtitle}>
            {lista.length === 0
              ? 'Nenhum projeto registrado ainda.'
              : `${plural(lista.length, 'projeto registrado', 'projetos registrados')}. Cada um é lido a partir da sua pasta.`}
          </p>
        </div>
        <div className={pageStyles.actions}>
          <ButtonLink to="/projetos/adicionar" variant="primary">
            Adicionar projeto
          </ButtonLink>
        </div>
      </header>

      {mensagem ? (
        <p className={styles.success} role="status">
          {mensagem}
        </p>
      ) : null}

      {lista.length === 0 ? (
        <EmptyState title="Adicione o primeiro projeto.">
          Escolha a pasta de um projeto com testes BDD. Você pode navegar pelas pastas ou digitar o caminho, como{' '}
          <span className="mono">~/code/meu-projeto</span>.
        </EmptyState>
      ) : (
        <ul className={styles.list} aria-label="Projetos registrados">
          {lista.map((p) => (
            <ProjetoItem key={p.id} projeto={p} />
          ))}
        </ul>
      )}
    </>
  );
}

function ProjetoItem({ projeto: p }: { projeto: ProjectSummary }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const remover = useMutation({
    mutationFn: () => api.removerProjeto(p.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.projetos });
      await queryClient.invalidateQueries({ queryKey: keys.visao });
      navigate('/projetos', { state: { mensagem: `${p.nome} removido. Os arquivos do projeto não foram alterados.` } });
    },
    onError: (err) => setErro(err instanceof ApiError ? err.message : 'não foi possível remover'),
  });

  return (
    <li className={styles.item}>
      <div className={styles.head}>
        <div className={styles.titleBox}>
          <span className={styles.name}>{p.nome}</span>
          <span className={`mono ${styles.path}`}>{p.caminho}</span>
          {p.descricao ? <span className={styles.desc}>{p.descricao}</span> : null}
        </div>
        <div className={styles.stacks}>
          {p.stacks.map((s) => (
            <span key={s.id} className={styles.stack} title={`${STACK_LABEL[s.id]} · ${s.caminho || 'raiz'}`}>
              <StackIcon stack={s.id} size={14} />
              {STACK_LABEL[s.id]}
            </span>
          ))}
        </div>
      </div>

      <dl className={styles.metrics}>
        <Metric label="funcionalidades" value={p.contadores.funcionalidades} />
        <Metric label="regras" value={p.contadores.regras} />
        <Metric label="cenários" value={p.contadores.cenarios} />
        <Metric label="avisos" value={p.avisos} />
        <Metric label="sincronizado" value={tempoRelativo(p.sincronizadoEm)} wide />
      </dl>

      {erro ? (
        <p className={styles.error} role="alert">
          {erro}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Link to={rotas.catalogo(p.id)} className={styles.link}>
          Catálogo de regras
        </Link>
        <Link to={`/projetos/${encodeURIComponent(p.id)}/estrutura`} className={styles.link}>
          Funcionalidades e testes
        </Link>
        <span className={styles.spacer} />
        {confirmando ? (
          <>
            <Button variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button variant="outline" disabled={remover.isPending} onClick={() => remover.mutate()}>
              {remover.isPending ? 'Removendo…' : 'Confirmar remoção'}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmando(true)}>
            Remover
          </Button>
        )}
      </div>
    </li>
  );
}

function Metric({ label, value, wide }: { label: string; value: number | string; wide?: boolean }) {
  return (
    <div className={`${styles.metric} ${wide ? styles.wide : ''}`}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={`mono ${styles.metricValue}`}>{value}</dd>
    </div>
  );
}
