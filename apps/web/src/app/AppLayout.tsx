import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { SearchDialog } from '../components/SearchDialog';
import { PendenciasAlert } from '../components/PendenciasAlert';
import styles from './AppLayout.module.css';

const CHAVE_RECOLHIDO = 'bv.sidebar.recolhida';

/** Shell com sidebar (recolhível) e área principal. Atalho global ⌘K / Ctrl+K abre a busca (RF-47). */
export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [recolhido, setRecolhido] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(CHAVE_RECOLHIDO) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
    } catch {
      // armazenamento indisponível: a preferência vale só nesta sessão
    }
  }, [recolhido]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar recolhido={recolhido} onToggle={() => setRecolhido((v) => !v)} />
      <main className={styles.main} id="conteudo">
        <PendenciasAlert />
        <Outlet context={{ abrirBusca: () => setSearchOpen(true) }} />
      </main>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
