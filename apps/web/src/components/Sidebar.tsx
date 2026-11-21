import { NavLink, useLocation, Link } from 'react-router-dom';
import { LayoutGrid, List, PanelLeftClose, PanelLeftOpen, Plus, Presentation, RefreshCw, Settings } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useFuncionalidades, useHealth, useProjetos } from '../api/queries';
import { tempoRelativo } from '../lib/format';
import { rotas } from '../lib/paths';
import styles from './Sidebar.module.css';

interface Props {
  recolhido: boolean;
  onToggle: () => void;
}

export function Sidebar({ recolhido, onToggle }: Props) {
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
  const classe = `${styles.sidebar} ${recolhido ? styles.recolhido : ''}`;

  return (
    <aside className={classe} aria-label="Navegação lateral" data-recolhido={recolhido}>
      <div className={styles.topo}>
        <Link to="/" className={styles.brand} aria-label="Behavior Viewer, visão geral">
          <span className={styles.mark} aria-hidden="true">
            R/
          </span>
          <span className={`${styles.wordmark} ${styles.label}`}>Behavior Viewer</span>
        </Link>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggle}
          aria-expanded={!recolhido}
          aria-controls="sidebar-conteudo"
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
        >
          {recolhido ? <PanelLeftOpen size={16} strokeWidth={1.5} aria-hidden="true" /> : <PanelLeftClose size={16} strokeWidth={1.5} aria-hidden="true" />}
        </button>
      </div>

      <div id="sidebar-conteudo" className={styles.conteudo}>
        <nav aria-label="Principal" className={styles.nav}>
          <NavItem
            to="/"
            icon={<LayoutGrid size={16} strokeWidth={1.5} />}
            label="Visão geral"
            active={location.pathname === '/'}
            recolhido={recolhido}
          />
          <NavItem
            to={catalogoTo}
            icon={<List size={16} strokeWidth={1.5} />}
            label="Catálogo de regras"
            active={location.pathname.startsWith('/projetos/') && !location.pathname.includes('/apresentar/')}
            disabled={!primeiro}
            recolhido={recolhido}
          />
          <NavItem
            to={apresentacaoTo}
            icon={<Presentation size={16} strokeWidth={1.5} />}
            label="Modo apresentação"
            active={location.pathname.includes('/apresentar/')}
            disabled={!primeiro}
            recolhido={recolhido}
          />
        </nav>

        <div className={styles.projects}>
          <div className={`${styles.sectionLabel} ${styles.label}`}>Projetos</div>
          {visiveis.map((p) => (
            <NavLink
              key={p.id}
              to={rotas.catalogo(p.id)}
              aria-label={`${p.nome}, ${p.contadores.regras} regras`}
              title={p.nome}
              className={({ isActive }) => `${styles.projectItem} ${isActive ? styles.projectActive : ''}`}
            >
              <span className={styles.inicial} aria-hidden="true">
                {p.nome.charAt(0).toUpperCase()}
              </span>
              <span className={styles.label}>{p.nome}</span>
              <span className={`mono ${styles.count} ${styles.label}`}>{p.contadores.regras}</span>
            </NavLink>
          ))}
          {projetos.data && visiveis.length === 0 ? (
            <span className={`${styles.hint} ${styles.label}`}>
              {projetos.data.length === 0 ? 'Nenhum projeto registrado.' : 'Nenhum projeto selecionado.'}
            </span>
          ) : null}
          <NavLink to="/projetos/adicionar" className={styles.addLink} aria-label="Adicionar projeto" title="Adicionar projeto">
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.label}>Adicionar projeto</span>
          </NavLink>
          <NavLink
            to="/projetos"
            end
            className={({ isActive }) => styles.addLink + (isActive ? ' ' + styles.projectActive : '')}
            aria-label="Gerenciar projetos"
            title="Gerenciar projetos"
          >
            <Settings size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.label}>Gerenciar projetos</span>
          </NavLink>
        </div>

        <div className={styles.footer}>
          <span className={styles.label}>{emVarredura ? 'Sincronizando…' : `Sincronizado ${tempoRelativo(ultimaVarredura)}`}</span>
          <button
            type="button"
            className={styles.sync}
            onClick={sincronizar}
            disabled={emVarredura}
            aria-label="Sincronizar"
            title="Sincronizar"
          >
            <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.label}>Sincronizar</span>
          </button>
        </div>
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
  recolhido,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  recolhido: boolean;
}) {
  const conteudo = (
    <>
      {icon}
      <span className={styles.label}>{label}</span>
    </>
  );
  const extra = recolhido ? { 'aria-label': label, title: label } : {};
  if (disabled) {
    return (
      <span className={`${styles.navItem} ${styles.disabled}`} aria-disabled="true" {...extra}>
        {conteudo}
      </span>
    );
  }
  return (
    <Link
      to={to}
      className={`${styles.navItem} ${active ? styles.navActive : ''}`}
      aria-current={active ? 'page' : undefined}
      {...extra}
    >
      {conteudo}
    </Link>
  );
}
