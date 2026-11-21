import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link2, Presentation } from 'lucide-react';
import { api } from '../api/client';
import { useRegra } from '../api/queries';
import type { RuleDetail } from '../api/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { Button, ButtonLink } from '../components/Button';
import { ErrorState, Loading } from '../components/States';
import { SegmentedControl } from '../components/SegmentedControl';
import { ScenarioCard } from '../components/ScenarioCard';
import { StackBanner } from '../components/StackBanner';
import { StatusChip } from '../components/StatusChip';
import { Tag } from '../components/Tag';
import { plural, rotuloStatus, STACK_LABEL } from '../lib/format';
import { principalDe } from '../lib/rule';
import { rotas } from '../lib/paths';
import styles from './RuleDetailPage.module.css';

const PAGE = 4;
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
  const principal = principalDe(regra);
  const cenarios = principal?.cenarios ?? [];
  const falhando = regra.implementacoes.find((i) => i.status === 'falhando');
  const projeto = regra.projeto.id;
  const funcionalidadeKey = regra.funcionalidade?.key ?? '';
  const telaTexto = regra.telas.map((t) => (t.rota ? `${t.nome} · ${t.rota}` : t.nome)).join(' · ');

  function avisar(msg: string) {
    setCopiado(msg);
    setTimeout(() => setCopiado(null), 1800);
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(window.location.href);
    avisar('Link copiado');
  }

  async function copiarGherkin(stack: string) {
    const texto = await api.gherkin(regra.id, projeto, stack);
    await navigator.clipboard.writeText(texto);
    avisar('Gherkin copiado');
  }

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
            ]}
          />
          <h1 className={styles.title}>
            <span className={`mono ${styles.id}`}>{regra.id}</span>
            {regra.titulo}
          </h1>
          <div className={styles.meta}>
            <StatusChip status={regra.status} texto={falhando ? rotuloStatus('falhando', STACK_LABEL[falhando.stack]) : rotuloStatus(regra.status)} />
            {telaTexto ? <span className={styles.tela}>Tela: {telaTexto}</span> : null}
            {regra.tags.map((t) => (
              <Tag key={t}>{t.startsWith('@') ? t : `@${t}`}</Tag>
            ))}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" icon={<Link2 size={14} strokeWidth={1.5} />} onClick={copiarLink}>
            Copiar link
          </Button>
          <ButtonLink
            to={rotas.apresentacao(projeto, funcionalidadeKey, regra.id)}
            variant="primary"
            icon={<Presentation size={14} strokeWidth={1.5} />}
          >
            Apresentar
          </ButtonLink>
        </div>
      </header>

      <StackBanner
        implementacoes={regra.implementacoes}
        ausentes={regra.ausentes}
        historico={regra.historico}
        onCopy={(stack) => copiarGherkin(stack)}
        principal={principal?.stack}
      />

      {copiado ? (
        <div role="status" aria-live="polite" className={styles.toast}>
          {copiado}
        </div>
      ) : null}

      <section className={styles.cenarios} aria-labelledby="cenarios-titulo">
        <div className={styles.scenarioHead}>
          <h2 id="cenarios-titulo" className={styles.sectionTitle}>
            {plural(cenarios.length, 'cenário', 'cenários')}
            {principal ? <span className={styles.stackTag}>{STACK_LABEL[principal.stack]}</span> : null}
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
    </>
  );
}

