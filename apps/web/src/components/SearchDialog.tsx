import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusca } from '../api/queries';
import { StatusDot } from './StatusDot';
import { rotas } from '../lib/paths';
import styles from './SearchDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Busca global aberta por ⌘K / Ctrl+K (RF-47). */
export function SearchDialog({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const busca = useBusca(q);
  const items = busca.data?.items ?? [];

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  function go(index: number) {
    const item = items[index];
    if (!item) return;
    navigate(rotas.regra(item.projetoId, item.id));
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar regra"
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, items.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          }
          if (e.key === 'Enter') go(active);
        }}
      >
        <input
          ref={inputRef}
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar regra, tag ou ID…"
          aria-label="Buscar regra, tag ou ID"
          aria-controls="resultados-busca"
          aria-activedescendant={items[active] ? `resultado-${active}` : undefined}
        />
        <ul id="resultados-busca" role="listbox" className={styles.list}>
          {q.trim() && items.length === 0 && !busca.isFetching ? (
            <li className={styles.empty}>Nenhuma regra encontrada.</li>
          ) : null}
          {items.map((item, i) => (
            <li
              key={`${item.projetoId}-${item.id}`}
              id={`resultado-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(i)}
            >
              <StatusDot status={item.status} />
              <span className={`mono ${styles.id}`}>{item.id}</span>
              <span className={styles.titulo}>{item.titulo}</span>
              <span className={styles.meta}>
                {item.projetoNome} · {item.funcionalidade}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
