import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../api/client';
import { keys, useFuncionalidades, useProjetos, useRegras } from '../api/queries';
import type { Cenario, RuleDetail, Stack } from '../api/types';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { STACK_LABEL, ehPalavraChave } from '../lib/format';
import { principalDe } from '../lib/rule';
import { APRESENTAR_TUDO, rotas } from '../lib/paths';
import styles from './PresentationPage.module.css';

interface Slide {
  regra: RuleDetail;
  cenario: Cenario;
  stack: Stack;
}

/**
 * Modo apresentação: um slide por cenário, na ordem das regras da funcionalidade. Cada slide
 * mostra o cenário em um cartão e as capturas de tela ao lado, sem rolagem. Setas navegam (RF-42 a RF-46).
 */
export function PresentationPage() {
  const { projetoId = '', funcionalidade = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const projetos = useProjetos();
  const funcs = useFuncionalidades(projetoId);
  const todas = funcionalidade === APRESENTAR_TUDO;
  const regras = useRegras(projetoId, todas ? {} : { funcionalidade });

  const projeto = projetos.data?.find((p) => p.id === projetoId);
  const feature = todas
    ? { key: APRESENTAR_TUDO, nome: 'Todas as funcionalidades', descricao: '', tags: [], arquivos: [], regras: 0, cenarios: 0 }
    : funcs.data?.find((f) => f.key === funcionalidade);
  const lista = useMemo(() => regras.data?.items ?? [], [regras.data]);

  const detalhes = useQueries({
    queries: lista.map((r) => ({
      queryKey: keys.regra(r.id, projetoId),
      queryFn: () => api.regra(r.id, projetoId),
    })),
  });
  const prontos = detalhes.every((d) => d.data !== undefined);
  const slides: Slide[] = prontos
    ? detalhes.flatMap((d) => {
        const regra = d.data as RuleDetail;
        const principal = principalDe(regra);
        return (principal?.cenarios ?? []).map((cenario) => ({ regra, cenario, stack: principal!.stack }));
      })
    : [];
  const total = slides.length;

  // Posição: ?regra=ID leva ao primeiro cenário da regra; ?i=N leva ao N-ésimo slide (começando em 1).
  const regraPedida = params.get('regra');
  const iPedido = Number(params.get('i'));
  let indice = 0;
  if (regraPedida) {
    const achado = slides.findIndex((s) => s.regra.id === regraPedida);
    indice = achado >= 0 ? achado : 0;
  } else if (Number.isInteger(iPedido) && iPedido >= 1) {
    indice = Math.min(iPedido, Math.max(total, 1)) - 1;
  }
  const atual = slides[indice];

  function irPara(i: number) {
    if (total === 0) return;
    const alvo = Math.min(Math.max(i, 0), total - 1);
    setParams({ i: String(alvo + 1) }, { replace: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') irPara(indice + 1);
      if (e.key === 'ArrowLeft') irPara(indice - 1);
      if (e.key === 'Home') irPara(0);
      if (e.key === 'End') irPara(total - 1);
      if (e.key === 'Escape') navigate(rotas.catalogo(projetoId, todas ? undefined : { funcionalidade }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const erro = [projetos, funcs, regras, ...detalhes].find((q) => q.isError);
  if (erro) return <ErrorState mensagem={(erro.error as Error).message} />;
  if (!projetos.data || !funcs.data || !regras.data || !prontos) return <Loading />;
  if (!projeto || !feature) {
    return (
      <div className={styles.center}>
        <EmptyState title="Funcionalidade não encontrada.">
          <Link to="/">Voltar para a visão geral</Link>
        </EmptyState>
      </div>
    );
  }
  if (total === 0 || !atual) {
    return (
      <div className={styles.center}>
        <EmptyState title="Esta funcionalidade não tem cenários para apresentar.">
          <Link to={rotas.catalogo(projetoId)}>Voltar ao catálogo</Link>
        </EmptyState>
      </div>
    );
  }

  const temCapturas = atual.cenario.capturas.length > 0;
  const n = atual.cenario.capturas.length;

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
          <Link to={rotas.catalogo(projetoId, todas ? undefined : { funcionalidade })} className={styles.exit}>
            <X size={14} strokeWidth={1.6} aria-hidden="true" />
            Sair
          </Link>
        </div>
      </header>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${((indice + 1) / total) * 100}%` }} />
      </div>

      <main className={styles.stage}>
        <section className={`${styles.slide} ${temCapturas ? styles.comCapturas : ''}`} aria-label={`Cenário ${indice + 1} de ${total}`}>
          <div className={styles.cardCol}>
            <div className={styles.regraInfo}>
              <span className={`mono ${styles.regraId}`}>
                {atual.regra.id} · {STACK_LABEL[atual.stack]}
              </span>
              <span className={styles.regraTitulo}>{atual.regra.titulo}</span>
              {atual.regra.telas.length > 0 ? (
                <span className={styles.tela}>
                  Tela: {atual.regra.telas.map((t) => (t.rota ? `${t.nome} · ${t.rota}` : t.nome)).join(' · ')}
                </span>
              ) : null}
            </div>
            <article className={styles.cartao}>
              <h1 className={styles.cenarioNome}>{atual.cenario.nome}</h1>
              <div className={styles.passos}>
                {atual.cenario.passos.map((p, i) => (
                  <div key={i} className={styles.passo}>
                    <span className={ehPalavraChave(p.palavra) && p.palavra !== 'E' && p.palavra !== 'And' ? styles.kw : styles.kwMuted}>
                      {p.palavra}
                    </span>
                    <span className={styles.texto}>{p.texto}</span>
                  </div>
                ))}
              </div>
              {atual.cenario.exemplos.length > 0 ? (
                <table className={styles.exemplos}>
                  <tbody>
                    {atual.cenario.exemplos.map((linha, i) => (
                      <tr key={i}>
                        {linha.map((c, j) => (i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </article>
          </div>

          {temCapturas ? (
            <div className={styles.capCol} aria-label="Capturas de tela">
              {atual.cenario.capturas.map((c, i) => (
                <figure key={`${c.arquivo}-${i}`} className={styles.figura}>
                  <img
                    src={c.url}
                    alt={`Tela durante o passo: ${c.passo}`}
                    className={styles.img}
                    style={{ maxHeight: `calc((100vh - 200px) / ${n} - 36px)` }}
                  />
                  <figcaption className={styles.legenda}>{c.passo}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <footer className={styles.footer}>
        <button type="button" className={styles.navBtn} onClick={() => irPara(indice - 1)} disabled={indice === 0} aria-label="Cenário anterior">
          <ChevronLeft size={16} strokeWidth={1.6} aria-hidden="true" />
          Anterior
        </button>
        <span className={styles.dica}>← → navegar · Esc sair</span>
        <button type="button" className={styles.navPrimary} onClick={() => irPara(indice + 1)} disabled={indice === total - 1} aria-label="Próximo cenário">
          Próximo
          <ChevronRight size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
