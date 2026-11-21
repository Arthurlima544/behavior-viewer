import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useFuncionalidades, useProjetos, useRegra, useRegras } from '../api/queries';
import type { RuleDetail } from '../api/types';
import { ErrorState, Loading, EmptyState } from '../components/States';
import { ScenarioCard } from '../components/ScenarioCard';
import { STACK_LABEL } from '../lib/format';
import { principalDe } from '../lib/rule';
import { rotas } from '../lib/paths';
import styles from './PresentationPage.module.css';

/** Modo apresentação: um slide por regra, com os cenários e as capturas ao lado dos passos (RF-42 a RF-46). */
export function PresentationPage() {
  const { projetoId = '', funcionalidade = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const projetos = useProjetos();
  const funcs = useFuncionalidades(projetoId);
  const regras = useRegras(projetoId, { funcionalidade });

  const projeto = projetos.data?.find((p) => p.id === projetoId);
  const feature = funcs.data?.find((f) => f.key === funcionalidade);
  const lista = useMemo(() => regras.data?.items ?? [], [regras.data]);

  const pedida = params.get('regra');
  const indice = Math.max(0, lista.findIndex((r) => r.id === pedida));
  const total = lista.length;
  const atual = lista[indice];
  const detalhe = useRegra(atual?.id ?? '', projetoId);

  function irPara(i: number) {
    const alvo = lista[Math.min(Math.max(i, 0), total - 1)];
    if (!alvo) return;
    setParams({ regra: alvo.id }, { replace: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') irPara(indice + 1);
      if (e.key === 'ArrowLeft') irPara(indice - 1);
      if (e.key === 'Home') irPara(0);
      if (e.key === 'End') irPara(total - 1);
      if (e.key === 'Escape') navigate(rotas.catalogo(projetoId, { funcionalidade }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (projetos.isError || funcs.isError || regras.isError) {
    const err = (projetos.error ?? funcs.error ?? regras.error) as Error;
    return <ErrorState mensagem={err.message} />;
  }
  if (!projetos.data || !funcs.data || !regras.data) return <Loading />;
  if (!projeto || !feature) {
    return (
      <div className={styles.center}>
        <EmptyState title="Funcionalidade não encontrada.">
          <Link to="/">Voltar para a visão geral</Link>
        </EmptyState>
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className={styles.center}>
        <EmptyState title="Esta funcionalidade não tem regras para apresentar.">
          <Link to={rotas.catalogo(projetoId)}>Voltar ao catálogo</Link>
        </EmptyState>
      </div>
    );
  }

  const progresso = ((indice + 1) / total) * 100;
  const numero = String(indice + 1).padStart(2, '0');

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.crumbs}>
          <span className={styles.brandMark} aria-hidden="true">
            R/
          </span>
          <span>{projeto.nome}</span>
          <span aria-hidden="true" className={styles.sep}>
            /
          </span>
          <span className={styles.current}>{feature.nome}</span>
        </div>
        <div className={styles.headRight}>
          <span className={`mono ${styles.counter}`} aria-live="polite">
            {indice + 1} de {total}
          </span>
          <Link to={rotas.catalogo(projetoId, { funcionalidade })} className={styles.exit}>
            <X size={14} strokeWidth={1.6} aria-hidden="true" />
            Sair da apresentação
          </Link>
        </div>
      </header>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
      </div>

      <main className={styles.main}>
        {detalhe.isError ? <ErrorState mensagem={(detalhe.error as Error).message} /> : null}
        {!detalhe.data && !detalhe.isError ? <Loading /> : null}
        {detalhe.data ? <Slide regra={detalhe.data} numero={numero} /> : null}
      </main>

      <footer className={styles.footer}>
        <button type="button" className={styles.navBtn} onClick={() => irPara(indice - 1)} disabled={indice === 0} aria-label="Regra anterior">
          <ChevronLeft size={16} strokeWidth={1.6} aria-hidden="true" />
          Anterior
        </button>
        <div className={styles.dots}>
          {lista.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ir para a regra ${i + 1}`}
              aria-current={i === indice ? 'step' : undefined}
              className={`${styles.dot} ${i === indice ? styles.dotActive : ''}`}
            />
          ))}
        </div>
        <button type="button" className={styles.navPrimary} onClick={() => irPara(indice + 1)} disabled={indice === total - 1} aria-label="Próxima regra">
          Próxima
          <ChevronRight size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}

function Slide({ regra, numero }: { regra: RuleDetail; numero: string }) {
  const principal = principalDe(regra);
  const telaTexto = regra.telas.map((t) => (t.rota ? `${t.nome} · ${t.rota}` : t.nome)).join(' · ');
  return (
    <section className={styles.slide} aria-label={`Regra ${numero}`}>
      <div className={styles.titleBox}>
        <span className={`mono ${styles.label}`}>
          REGRA {numero} · {regra.id}
          {principal ? <span className={styles.stack}> · {STACK_LABEL[principal.stack]}</span> : null}
        </span>
        <h1 className={styles.title}>{regra.titulo}</h1>
        {telaTexto ? <p className={styles.tela}>Tela: {telaTexto}</p> : null}
      </div>

      <div className={styles.cenarios}>
        {(principal?.cenarios ?? []).map((c) => (
          <ScenarioCard key={`${c.linha}-${c.nome}`} cenario={c} modo="gherkin" escala="grande" />
        ))}
      </div>
    </section>
  );
}
