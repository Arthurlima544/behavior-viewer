import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { SearchDialog } from '../components/SearchDialog';
import styles from './AppLayout.module.css';

/** Shell com sidebar fixa e área principal. Atalho global ⌘K / Ctrl+K abre a busca (RF-47). */
export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

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
      <Sidebar />
      <main className={styles.main} id="conteudo">
        <Outlet context={{ abrirBusca: () => setSearchOpen(true) }} />
      </main>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
