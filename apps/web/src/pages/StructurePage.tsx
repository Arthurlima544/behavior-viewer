import { Link, useParams } from 'react-router-dom';
import { useEstrutura } from '../api/queries';
import { Breadcrumb } from '../components/Breadcrumb';
import { ButtonLink } from '../components/Button';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { StackIcon } from '../components/StackIcon';
import { plural } from '../lib/format';
import { rotas } from '../lib/paths';
import pageStyles from './Page.module.css';
import styles from './StructurePage.module.css';

/** Estrutura identificada de um projeto: stacks, funcionalidades por arquivo e testes BDD (RF-03, RF-04). */
export function StructurePage() {
  const { projetoId = '' } = useParams();
  const estrutura = useEstrutura(projetoId);

  if (estrutura.isError) {
    return <ErrorState mensagem={(estrutura.error as Error).message} onRetry={() => estrutura.refetch()} />;
  }
  if (!estrutura.data) return <Loading />;
  const e = estrutura.data;

  return (
    <>
      <header className={pageStyles.header}>
        <div className={pageStyles.titleBox}>
          <Breadcrumb
            items={[
              { label: 'Projetos', to: rotas.visaoGeral() },
              { label: e.projeto.nome, to: rotas.catalogo(e.projeto.id) },
              { label: 'Estrutura' },
            ]}
          />
          <h1 className={pageStyles.title}>{e.projeto.nome}</h1>
          <p className={`mono ${styles.path}`}>{e.projeto.caminho}</p>
          {e.projeto.descricao ? <p className={pageStyles.subtitle}>{e.projeto.descricao}</p> : null}
        </div>
        <div className={pageStyles.actions}>
          <Link to="/projetos" className={styles.back}>
            Projetos
          </Link>
          <ButtonLink to={rotas.catalogo(e.projeto.id)} variant="primary">
            Catálogo de regras
          </ButtonLink>
        </div>
      </header>

      <section className={styles.summary} aria-label="Resumo">
        <Summary label="funcionalidades" value={e.testes.funcionalidades} />
        <Summary label="arquivos .feature" value={e.testes.arquivosFeature} />
        <Summary label="regras" value={e.testes.regras} />
        <Summary label="cenários" value={e.testes.cenarios} />
      </section>

      <section className={styles.section} aria-labelledby="stacks-titulo">
        <h2 id="stacks-titulo" className={styles.title}>
          Stacks identificadas
        </h2>
        {e.stacks.length === 0 ? (
          <EmptyState title="Nenhuma stack reconhecida.">
            Os arquivos .feature foram encontrados, mas nenhum manifesto (pubspec.yaml, package.json ou pom.xml) foi reconhecido.
          </EmptyState>
        ) : (
          <div className={styles.stacks}>
            {e.stacks.map((s) => (
              <article key={s.id} className={styles.stackCard}>
                <div className={styles.stackHead}>
                  <span className={styles.icon}>
                    <StackIcon stack={s.id} size={16} />
                  </span>
                  <span className={styles.stackName}>{s.rotulo}</span>
                </div>
                <span className={`mono ${styles.muted}`}>{s.caminho || 'raiz do projeto'}</span>
                <span className={styles.muted}>
                  {s.runner} · {plural(s.arquivos, 'arquivo', 'arquivos')}
                </span>
                {s.relatorios.length > 0 ? (
                  <span className={`mono ${styles.muted}`}>relatórios: {s.relatorios.length}</span>
                ) : (
                  <span className={styles.muted}>sem relatórios de execução</span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {e.telas.length > 0 ? (
        <section className={styles.section} aria-labelledby="telas-decl-titulo">
          <h2 id="telas-decl-titulo" className={styles.title}>
            Telas declaradas
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tela</th>
                  <th scope="col">Rota</th>
                  <th scope="col">Arquivo</th>
                  <th scope="col">Componentes</th>
                  <th scope="col" className={styles.num}>
                    Regras
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.telas.map((t) => (
                  <tr key={t.nome}>
                    <td>{t.nome}</td>
                    <td className={`mono ${styles.muted}`}>{t.rota ?? '—'}</td>
                    <td className={`mono ${styles.muted}`}>{t.arquivo ?? '—'}</td>
                    <td className={styles.muted}>{t.componentes.map((c) => c.nome).join(', ') || '—'}</td>
                    <td className={`mono ${styles.num}`}>{t.regras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="funcs-titulo">
        <h2 id="funcs-titulo" className={styles.title}>
          Funcionalidades e testes BDD
        </h2>
        {e.funcionalidades.length === 0 ? (
          <EmptyState title="Nenhuma funcionalidade encontrada.">
            Adicione arquivos .feature ao projeto e registre-o de novo, ou aguarde a próxima varredura.
          </EmptyState>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Funcionalidade</th>
                  <th scope="col">Stack</th>
                  <th scope="col">Arquivo</th>
                  <th scope="col">Idioma</th>
                  <th scope="col" className={styles.num}>
                    Regras
                  </th>
                  <th scope="col" className={styles.num}>
                    Cenários
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.funcionalidades.map((f) => (
                  <tr key={`${f.stack}-${f.arquivo}`}>
                    <td>{f.funcionalidade}</td>
                    <td>{f.rotulo}</td>
                    <td className={`mono ${styles.muted}`}>{f.arquivo}</td>
                    <td className={`mono ${styles.muted}`}>{f.idioma}</td>
                    <td className={`mono ${styles.num}`}>{f.regras}</td>
                    <td className={`mono ${styles.num}`}>{f.cenarios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {e.erros.length > 0 ? (
        <section className={styles.section} aria-labelledby="erros-titulo">
          <h2 id="erros-titulo" className={styles.title}>
            Erros de leitura ({e.erros.length})
          </h2>
          <ul className={styles.errors}>
            {e.erros.map((err, i) => (
              <li key={i} className={styles.errorItem}>
                <span className={`mono ${styles.muted}`}>
                  {err.arquivo}
                  {err.linha ? `:${err.linha}` : ''}
                </span>
                <span>{err.mensagem}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryValue}>{value.toLocaleString('pt-BR')}</span>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}

