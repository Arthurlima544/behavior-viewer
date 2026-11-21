import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Link2, Presentation } from 'lucide-react';
import { api } from '../api/client';
import { useRegra } from '../api/queries';
import type { RuleDetail } from '../api/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { Button, ButtonLink } from '../components/Button';
import { ErrorState, Loading } from '../components/States';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatusChip } from '../components/StatusChip';
import { Tag } from '../components/Tag';
import { ImplementationCard } from '../components/ImplementationCard';
import { RunHistoryStrip } from '../components/RunHistoryStrip';
import { ScenarioCard } from '../components/ScenarioCard';
import { rotuloStatus, STACK_LABEL, tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import styles from './RuleDetailPage.module.css';

const PAGE = 2;
type Modo = 'gherkin' | 'texto';

export function RuleDetailPage() {
  const { projetoId = '', regraId = '' } = useParams();
  const regra = useRegra(regraId, projetoId);

  if (regra.isError) return <ErrorState mensagem={(regra.error as Error).message} onRetry={() => regra.refetch()} />;
  if (!regra.data) return <Loading />;
  return <Detalhe regra={regra.data} />;
}

function Detalhe({ regra }: { regra: RuleDetail }) {
  const [modo, setModo] = useState<Modo>('gherkin');
  const [visiveis, setVisiveis] = useState(PAGE);
  const [copiado, setCopiado] = useState<string | null>(null);
  const principal = regra.implementacoes[0];
  const cenarios = principal?.cenarios ?? [];
  const falhando = regra.implementacoes.find((i) => i.status === 'falhando');
  const ultimaAlteracao = regra.implementacoes.find((i) => i.ultimaAlteracao)?.ultimaAlteracao ?? null;
  const funcionalidadeKey = regra.funcionalidade?.key;
  const projeto = regra.projeto.id;

  async function copiarLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopiado('Link copiado');
    setTimeout(() => setCopiado(null), 1800);
  }

  async function copiarGherkin(stack: string) {
    const texto = await api.gherkin(regra.id, projeto, stack);
    await navigator.clipboard.writeText(texto);
    setCopiado('Gherkin copiado');
    setTimeout(() => setCopiado(null), 1800);
  }

  const rotuloChip = falhando ? rotuloStatus('falhando', STACK_LABEL[falhando.stack]) : rotuloStatus(regra.status);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <Breadcrumb
            items={[
              { label: 'Projetos', to: rotas.visaoGeral() },
              { label: regra.projeto.nome, to: rotas.catalogo(projeto) },
              ...(regra.funcionalidade
                ? [{ label: regra.funcionalidade.nome, to: rotas.catalogo(projeto, { funcionalidade: funcionalidadeKey }) }]
                : []),
              { label: regra.id, mono: true },
            ]}
          />
          <span className={`mono ${styles.id}`}>{regra.id}</span>
          <h1 className={styles.title}>{regra.titulo}</h1>
          <div className={styles.meta}>
            <StatusChip status={regra.status} texto={rotuloChip} />
            {regra.tags.map((t) => (
              <Tag key={t}>{t.startsWith('@') ? t : `@${t}`}</Tag>
            ))}
            {ultimaAlteracao ? (
              <span className={styles.metaText}>
                {regra.funcionalidade?.nome ?? ''} · alterada {tempoRelativo(ultimaAlteracao.data)} em{' '}
                <span className="mono">{ultimaAlteracao.commit}</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" icon={<Link2 size={16} strokeWidth={1.5} />} onClick={copiarLink}>
            Copiar link
          </Button>
          <ButtonLink
            to={rotas.apresentacao(projeto, funcionalidadeKey ?? '', regra.id)}
            variant="primary"
            icon={<Presentation size={16} strokeWidth={1.5} />}
          >
            Apresentar
          </ButtonLink>
        </div>
      </header>
      <div role="status" aria-live="polite" className={styles.toast}>
        {copiado ?? ''}
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.card} aria-label="Em linguagem de negócio">
            <span className={styles.eyebrow}>Em linguagem de negócio</span>
            <p className={styles.business}>
              {regra.descricao || [regra.situacao, regra.resultado].filter(Boolean).join(' ') || 'Esta regra não tem descrição no arquivo de origem.'}
            </p>
            {regra.funcionalidade ? (
              <span className={styles.source}>
                Extraído da descrição da funcionalidade em <span className="mono">{principal?.arquivo ?? ''}</span>
              </span>
            ) : null}
            {regra.avisos.map((a) => (
              <span key={a} className={styles.warn}>
                {a}
              </span>
            ))}
          </section>

          <section className={styles.scenarios} aria-labelledby="cenarios-titulo">
            <div className={styles.scenarioHead}>
              <h2 id="cenarios-titulo" className={styles.sectionTitle}>
                Cenários <span className={`mono ${styles.count}`}>{cenarios.length}</span>
              </h2>
              <SegmentedControl<Modo>
                ariaLabel="Formato dos cenários"
                value={modo}
                onChange={setModo}
                options={[
                  { value: 'gherkin', label: 'Gherkin' },
                  { value: 'texto', label: 'Texto simples' },
                ]}
              />
            </div>
            {cenarios.slice(0, visiveis).map((c) => (
              <ScenarioCard key={`${c.linha}-${c.nome}`} cenario={c} modo={modo} />
            ))}
            {cenarios.length > visiveis ? (
              <button type="button" className={styles.more} onClick={() => setVisiveis((v) => v + PAGE)}>
                Mostrar mais {Math.min(PAGE, cenarios.length - visiveis)} cenários
              </button>
            ) : null}
          </section>
        </div>

        <aside className={styles.side} aria-label="Onde a regra está">
          <section className={styles.sideSection}>
            <h2 className={styles.sectionTitle}>Onde a regra está</h2>
            {regra.implementacoes.map((i) => (
              <ImplementationCard key={i.stack} impl={i} />
            ))}
            {regra.ausentes.map((a) => (
              <div key={a.stack} className={styles.missing}>
                <p className={styles.missingText}>
                  Nenhum cenário com esta regra na stack <strong>{a.rotulo}</strong>.
                </p>
                <Button variant="outline" icon={<Copy size={14} strokeWidth={1.5} />} onClick={() => copiarGherkin(principal?.stack ?? a.stack)}>
                  Copiar Gherkin
                </Button>
              </div>
            ))}
          </section>

          <section className={styles.sideSection}>
            <span className={styles.eyebrow}>Últimas 14 execuções</span>
            {regra.historico.map((h) => (
              <RunHistoryStrip key={h.stack} rotulo={h.rotulo} execucoes={h.execucoes} />
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
