import { NavLink, useLocation, Link } from 'react-router-dom';
import { LayoutGrid, List, Presentation, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useFuncionalidades, useHealth, useProjetos } from '../api/queries';
import { tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const location = useLocation();
  const projetos = useProjetos();
  const health = useHealth();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const visiveis = (projetos.data ?? []).filter((p) => p.selecionado);
  const primeiro = visiveis[0];
  const primeiroFeature = useFuncionalidades(primeiro?.id ?? '');
  const featureInicial = primeiroFeature.data?.[0]?.key;
  const apresentacaoTo =
    primeiro && featureInicial ? rotas.apresentacao(primeiro.id, featureInicial) : primeiro ? rotas.catalogo(primeiro.id) : '/';
  const catalogoTo = primeiro ? rotas.catalogo(primeiro.id) : '/';

  async function sincronizar() {
    setSyncing(true);
    try {
      await api.varrer();
      await new Promise((r) => setTimeout(r, 1200));
      await queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
    }
  }

  const ultimaVarredura = health.data?.ultimaVarredura ?? null;
  const emVarredura = syncing || health.data?.emVarredura;

  return (
    <aside className={styles.sidebar} aria-label="Navegação lateral">
      <Link to="/" className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          R/
        </span>
        <span className={styles.wordmark}>Behavior Viewer</span>
      </Link>

      <nav aria-label="Principal" className={styles.nav}>
        <NavItem to="/" icon={<LayoutGrid size={16} strokeWidth={1.5} />} label="Visão geral" active={location.pathname === '/'} />
        <NavItem
          to={catalogoTo}
          icon={<List size={16} strokeWidth={1.5} />}
          label="Catálogo de regras"
          active={location.pathname.startsWith('/projetos/') && !location.pathname.includes('/apresentar/')}
          disabled={!primeiro}
        />
        <NavItem
          to={apresentacaoTo}
          icon={<Presentation size={16} strokeWidth={1.5} />}
          label="Modo apresentação"
          active={location.pathname.includes('/apresentar/')}
          disabled={!primeiro}
        />
      </nav>

      <div className={styles.projects}>
        <div className={styles.sectionLabel}>Projetos</div>
        {visiveis.map((p) => (
          <NavLink
            key={p.id}
            to={rotas.catalogo(p.id)}
            className={({ isActive }) => `${styles.projectItem} ${isActive ? styles.projectActive : ''}`}
          >
            <span>{p.nome}</span>
            <span className={`mono ${styles.count}`}>{p.contadores.regras}</span>
          </NavLink>
        ))}
        {projetos.data && visiveis.length === 0 ? (
          <span className={styles.hint}>Nenhum projeto selecionado.</span>
        ) : null}
      </div>

      <div className={styles.footer}>
        <span>{emVarredura ? 'Sincronizando…' : `Sincronizado ${tempoRelativo(ultimaVarredura)}`}</span>
        <button type="button" className={styles.sync} onClick={sincronizar} disabled={emVarredura}>
          <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
          Sincronizar
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  disabled,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className={`${styles.navItem} ${styles.disabled}`} aria-disabled="true">
        {icon}
        {label}
      </span>
    );
  }
  return (
    <Link to={to} className={`${styles.navItem} ${active ? styles.navActive : ''}`} aria-current={active ? 'page' : undefined}>
      {icon}
      {label}
    </Link>
  );
}


