import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Candidato, Descoberta } from '../api/types';
import { keys } from '../api/queries';
import { Breadcrumb } from '../components/Breadcrumb';
import { Button } from '../components/Button';
import { CandidateList } from '../components/CandidateList';
import { FolderBrowser } from '../components/FolderBrowser';
import { EmptyState } from '../components/States';
import { plural } from '../lib/format';
import { rotas } from '../lib/paths';
import pageStyles from './Page.module.css';
import styles from './AddProjectPage.module.css';

/** Fluxo de inclusão: escolher pasta → identificar projetos → registrar os selecionados (RF-01, RF-02). */
export function AddProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [descoberta, setDescoberta] = useState<Descoberta | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const descobrir = useMutation({
    mutationFn: (caminho: string) => api.descobrir(caminho),
    onSuccess: (data) => {
      setErro(null);
      setDescoberta(data);
      setSelecionados(new Set(data.candidatos.filter((c) => !c.jaRegistrado).map((c) => c.id)));
    },
    onError: (err) => setErro(mensagem(err)),
  });

  const registrar = useMutation({
    mutationFn: async (candidatos: Candidato[]) => {
      const falhas: string[] = [];
      for (const c of candidatos) {
        try {
          await api.registrarProjeto(c.caminho);
        } catch (err) {
          falhas.push(`${c.nome}: ${mensagem(err)}`);
        }
      }
      return { total: candidatos.length, falhas };
    },
    onSuccess: async ({ falhas, total }) => {
      await queryClient.invalidateQueries({ queryKey: keys.projetos });
      await queryClient.invalidateQueries({ queryKey: keys.visao });
      if (falhas.length === 0) {
        navigate('/projetos', { state: { mensagem: `${plural(total, 'projeto registrado', 'projetos registrados')}.` } });
      } else {
        setErro(`Alguns projetos não foram registrados. ${falhas.join(' · ')}`);
      }
    },
  });

  const selecionadosList = (descoberta?.candidatos ?? []).filter((c) => selecionados.has(c.id));

  function alternar(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <header className={pageStyles.header}>
        <div className={pageStyles.titleBox}>
          <Breadcrumb items={[{ label: 'Projetos', to: rotas.visaoGeral() }, { label: 'Adicionar' }]} />
          <h1 className={pageStyles.title}>Adicionar projeto</h1>
          <p className={pageStyles.subtitle}>
            Escolha a pasta de um projeto, ou a pasta que contém vários. O Behavior Viewer identifica os projetos com arquivos
            <span className="mono"> .feature</span> e você escolhe quais registrar.
          </p>
        </div>
        <Link to="/projetos" className={styles.back}>
          Voltar aos projetos
        </Link>
      </header>

      <FolderBrowser onUse={(caminho) => descobrir.mutate(caminho)} busy={descobrir.isPending} />

      {descobrir.isPending ? <p className={styles.status} role="status">Procurando projetos…</p> : null}
      {erro ? (
        <p className={styles.error} role="alert">
          {erro}
        </p>
      ) : null}

      {descoberta ? (
        <section className={styles.results} aria-label="Resultado da busca">
          <div className={styles.resultsHead}>
            <h2 className={styles.sectionTitle}>
              {descoberta.candidatos.length === 0
                ? 'Nenhum projeto encontrado'
                : `${plural(descoberta.candidatos.length, 'projeto identificado', 'projetos identificados')}`}
            </h2>
            <span className={`mono ${styles.pasta}`}>{descoberta.pasta}</span>
          </div>

          {descoberta.parcial ? (
            <p className={styles.warn} role="status">
              A busca atingiu o limite de tempo ou de arquivos. Escolha uma pasta mais específica para ver tudo.
            </p>
          ) : null}

          {descoberta.candidatos.length === 0 ? (
            <EmptyState title="Nenhum arquivo .feature encontrado nesta pasta.">
              Confira se a pasta é a raiz do projeto ou de uma das suas stacks (Flutter, TypeScript ou Java), e se os testes BDD estão
              em arquivos <span className="mono">.feature</span>.
            </EmptyState>
          ) : (
            <>
              <CandidateList candidatos={descoberta.candidatos} selecionados={selecionados} onToggle={alternar} />
              <div className={styles.actions}>
                <span className={styles.count}>{plural(selecionadosList.length, 'selecionado', 'selecionados')}</span>
                <Button
                  variant="primary"
                  disabled={selecionadosList.length === 0 || registrar.isPending}
                  onClick={() => registrar.mutate(selecionadosList)}
                >
                  {registrar.isPending ? 'Registrando…' : `Registrar ${plural(selecionadosList.length, 'projeto', 'projetos')}`}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

function mensagem(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : 'erro inesperado';
}
