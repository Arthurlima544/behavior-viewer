import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useFuncionalidades, useProjetos, useRegras } from '../api/queries';
import type { RuleStatus, RuleSummary, Stack } from '../api/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { ButtonLink, Button } from '../components/Button';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { RuleGroup } from '../components/RuleGroup';
import { FeatureNav } from '../components/FeatureNav';
import { SearchField } from '../components/SearchField';
import { StackIcon } from '../components/StackIcon';
import { STACK_LABEL, STATUS_OPTIONS, plural } from '../lib/format';
import { APRESENTAR_TUDO, rotas } from '../lib/paths';
import pageStyles from './Page.module.css';
import styles from './CatalogPage.module.css';

export function CatalogPage() {
  const { projetoId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const projetos = useProjetos();
  const projeto = projetos.data?.find((p) => p.id === projetoId);

  const q = params.get('q') ?? '';
  const stack = params.get('stack') ?? '';
  const status = params.get('status') ?? '';
  const divergentes = params.get('divergentes') === 'true';
  const funcionalidade = params.get('funcionalidade') ?? '';

  const funcs = useFuncionalidades(projetoId);
  const regras = useRegras(projetoId, {
    q: q || undefined,
    stack: stack || undefined,
    status: status || undefined,
    divergentes: divergentes ? 'true' : undefined,
    funcionalidade: funcionalidade || undefined,
  });

  function atualizar(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  }

  const grupos = useMemo(() => agrupaPorFuncionalidade(regras.data?.items ?? [], funcs.data ?? []), [regras.data, funcs.data]);

  if (projetos.isError) return <ErrorState mensagem={(projetos.error as Error).message} onRetry={() => projetos.refetch()} />;
  if (projetos.data && !projeto) {
    return (
      <EmptyState title="Projeto não encontrado.">
        <Link to="/">Voltar para a visão geral</Link>
      </EmptyState>
    );
  }
  if (!projeto || !funcs.data) return <Loading />;

  const stacksDoProjeto = projeto.stacks.map((s) => s.id);
  const nomeFuncionalidade = funcs.data.find((f) => f.key === funcionalidade)?.nome ?? funcionalidade;
  const apresentarTo = funcionalidade
    ? rotas.apresentacao(projeto.id, funcionalidade)
    : rotas.apresentacao(projeto.id, APRESENTAR_TUDO);
  const apresentarLabel = funcionalidade ? `Apresentar "${nomeFuncionalidade}"` : 'Apresentar tudo';
  const filtrosAtivos = Boolean(q || stack || status || divergentes || funcionalidade);

  return (
    <>
      <header className={pageStyles.header}>
        <div className={styles.headBox}>
          <Breadcrumb
            items={[{ label: 'Projetos', to: rotas.visaoGeral() }, { label: projeto.nome }]}
          />
          <h1 className={pageStyles.title}>Catálogo de regras</h1>
          <p className={pageStyles.subtitle}>
            {plural(projeto.contadores.regras, 'regra', 'regras')} em {plural(projeto.contadores.funcionalidades, 'funcionalidade', 'funcionalidades')} ·{' '}
            {stacksDoProjeto.map((s) => STACK_LABEL[s]).join(', ')}
          </p>
        </div>
        <ButtonLink to={apresentarTo} variant="primary">
          {apresentarLabel}
        </ButtonLink>
      </header>

      <div role="toolbar" aria-label="Filtros" className={styles.toolbar}>
        <SearchField
          value={q}
          onChange={(v) => atualizar({ q: v })}
          placeholder="Filtrar por texto, ID ou @tag"
          label="Filtrar regras"
          width={260}
        />
        <Divider />
        <Button variant={stack ? 'outline' : 'primary'} aria-pressed={!stack} onClick={() => atualizar({ stack: undefined })}>
          Todas
        </Button>
        {stacksDoProjeto.map((s: Stack) => (
          <Button
            key={s}
            variant="outline"
            aria-pressed={stack === s}
            className={stack === s ? styles.pressed : ''}
            icon={<StackIcon stack={s} size={14} />}
            onClick={() => atualizar({ stack: stack === s ? undefined : s })}
          >
            {STACK_LABEL[s]}
          </Button>
        ))}
        <Divider />
        <label className={styles.select}>
          <span className="sr-only">Filtrar por status</span>
          <select value={status} onChange={(e) => atualizar({ status: e.target.value || undefined })} className={styles.selectInput}>
            <option value="">Status: todos</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Status: {o.label.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" aria-pressed={divergentes} className={divergentes ? styles.pressed : ''} onClick={() => atualizar({ divergentes: divergentes ? undefined : 'true' })}>
          Só divergentes
        </Button>
        {filtrosAtivos ? (
          <Button variant="ghost" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className={styles.body}>
        <FeatureNav
          items={funcs.data}
          ativa={funcionalidade}
          onSelect={(key) => atualizar({ funcionalidade: key === funcionalidade ? undefined : key })}
        />

        <div className={styles.groups}>
          {regras.isError ? <ErrorState mensagem={(regras.error as Error).message} onRetry={() => regras.refetch()} /> : null}
          {!regras.data && !regras.isError ? <Loading /> : null}
          {regras.data && grupos.length === 0 ? (
            <EmptyState title="Nenhuma regra com estes filtros.">
              Ajuste a busca ou limpe os filtros para ver todas as regras do projeto.
            </EmptyState>
          ) : null}
          {grupos.map((g) => (
            <RuleGroup key={g.key} projetoId={projeto.id} grupo={g} stacks={projeto.stacks.map((s) => s.id)} />
          ))}
        </div>
      </div>
    </>
  );
}

function Divider() {
  return <span className={styles.divider} aria-hidden="true" />;
}

export interface GrupoFuncionalidade {
  key: string;
  nome: string;
  arquivo: string;
  regras: RuleSummary[];
  contagem: Record<RuleStatus, number>;
}

function agrupaPorFuncionalidade(
  items: RuleSummary[],
  funcs: { key: string; nome: string; arquivos: { arquivo: string }[] }[],
): GrupoFuncionalidade[] {
  const map = new Map<string, GrupoFuncionalidade>();
  for (const f of funcs) {
    map.set(f.key, {
      key: f.key,
      nome: f.nome,
      arquivo: f.arquivos[0]?.arquivo ?? '',
      regras: [],
      contagem: { passando: 0, falhando: 0, pendente: 0, 'sem-execucao': 0, 'sem-cobertura': 0 },
    });
  }
  for (const r of items) {
    let g = map.get(r.funcionalidadeKey);
    if (!g) {
      g = {
        key: r.funcionalidadeKey,
        nome: r.funcionalidadeNome,
        arquivo: '',
        regras: [],
        contagem: { passando: 0, falhando: 0, pendente: 0, 'sem-execucao': 0, 'sem-cobertura': 0 },
      };
      map.set(r.funcionalidadeKey, g);
    }
    g.regras.push(r);
    g.contagem[r.status]++;
  }
  return [...map.values()].filter((g) => g.regras.length > 0);
}
