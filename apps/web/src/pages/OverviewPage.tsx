import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDivergencias, useMatriz, useProjetos, useVisaoGeral } from '../api/queries';
import { KpiCard } from '../components/KpiCard';
import { ProjectCard } from '../components/ProjectCard';
import { SearchField } from '../components/SearchField';
import { ButtonLink } from '../components/Button';
import { CoverageMatrix } from '../components/CoverageMatrix';
import { DivergencesPanel } from '../components/DivergencesPanel';
import { ErrorState, Loading, EmptyState } from '../components/States';
import { StackIcon } from '../components/StackIcon';
import { atalhoBusca, plural, STACK_LABEL, tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import type { Stack } from '../api/types';
import pageStyles from './Page.module.css';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  const { abrirBusca } = useOutletContext<{ abrirBusca: () => void }>();
  const visao = useVisaoGeral();
  const projetos = useProjetos();
  const visiveis = useMemo(() => (projetos.data ?? []).filter((p) => p.selecionado), [projetos.data]);
  const primeiro = visiveis[0];
  const matriz = useMatriz(primeiro?.id ?? '');
  const divergencias = useDivergencias(primeiro?.id ?? '');
  const atalho = atalhoBusca();

  const stacksUnicas = useMemo(() => {
    const set = new Set<Stack>();
    for (const p of visiveis) for (const s of p.stacks) set.add(s.id);
    return [...set];
  }, [visiveis]);

  if (visao.isError) return <ErrorState mensagem={(visao.error as Error).message} onRetry={() => visao.refetch()} />;
  if (projetos.isError) return <ErrorState mensagem={(projetos.error as Error).message} onRetry={() => projetos.refetch()} />;
  if (!visao.data || !projetos.data) return <Loading />;

  const v = visao.data;
  const ocultos = projetos.data.length - visiveis.length;

  return (
    <>
      <header className={pageStyles.header}>
        <div className={pageStyles.titleBox}>
          <h1 className={pageStyles.title}>Visão geral</h1>
          <p className={pageStyles.subtitle}>
            Regras de negócio extraídas dos testes BDD de {plural(v.projetos, 'projeto', 'projetos')}.
          </p>
        </div>
        <div className={pageStyles.actions}>
          <SearchField
            value=""
            onChange={() => undefined}
            onFocus={abrirBusca}
            placeholder="Buscar regra, tag ou ID…"
            label="Buscar regra"
            shortcut={atalho.tecla}
            width={260}
          />
          {primeiro ? (
            <ButtonLink to={rotas.catalogo(primeiro.id)} variant="primary">
              Abrir catálogo
            </ButtonLink>
          ) : null}
        </div>
      </header>

      <section aria-label="Indicadores" className={styles.kpis}>
        <KpiCard label="Regras de negócio" value={formatNumber(v.regras)} sub={`em ${plural(v.projetos, 'projeto', 'projetos')} visíveis`} />
        <KpiCard label="Funcionalidades" value={formatNumber(v.funcionalidades)} sub="arquivos .feature consolidados" />
        <KpiCard label="Cenários" value={formatNumber(v.cenarios)} sub={`em ${plural(stacksUnicas.length, 'linguagem', 'linguagens')}`} />
        <KpiCard label="Passando" value={`${v.percentualPassando}%`} sub={`relatórios ${tempoRelativo(v.ultimaVarredura)}`} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Projetos</h2>
          <ul className={styles.legend} aria-label="Stacks">
            {stacksUnicas.map((s) => (
              <li key={s} className={styles.legendItem}>
                <StackIcon stack={s} size={14} />
                {STACK_LABEL[s]}
              </li>
            ))}
          </ul>
        </div>
        {visiveis.length === 0 ? (
          <EmptyState title="Nenhum projeto selecionado.">
            Marque um projeto na lista de projetos para vê-lo aqui, ou confira a variável <code>BEHAVIOR_WORKSPACE</code>.
          </EmptyState>
        ) : (
          <div className={styles.grid}>
            {visiveis.map((p) => (
              <ProjectCard key={p.id} projeto={p} />
            ))}
          </div>
        )}
        {ocultos > 0 ? <p className={styles.hidden}>{plural(ocultos, 'projeto oculto', 'projetos ocultos')} na sidebar.</p> : null}
      </section>

      {primeiro ? (
        <section className={styles.section} aria-label="Presença por camada">
          <div className={styles.sectionHead}>
            <div className={styles.presenceTitle}>
              <h2 className={styles.sectionTitle}>Presença por camada · {primeiro.nome}</h2>
              <p className={styles.sectionText}>Quantas regras de cada funcionalidade estão cobertas em cada linguagem.</p>
            </div>
            <a className={styles.more} href={rotas.catalogo(primeiro.id)}>
              Abrir catálogo →
            </a>
          </div>
          <div className={styles.presenceGrid}>
            {matriz.data ? <CoverageMatrix matriz={matriz.data} /> : <Loading />}
            {divergencias.data ? (
              <DivergencesPanel
                projetoId={primeiro.id}
                divergencias={divergencias.data.items}
              />
            ) : (
              <Loading />
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}
