import { Link } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

export interface Crumb {
  label: string;
  to?: string;
  mono?: boolean;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha" className={styles.trail}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className={styles.item}>
          {i > 0 ? <span aria-hidden="true" className={styles.sep}>/</span> : null}
          {item.to ? (
            <Link to={item.to} className={`${styles.link} ${item.mono ? 'mono' : ''}`}>
              {item.label}
            </Link>
          ) : (
            <span className={`${styles.current} ${item.mono ? 'mono' : ''}`} aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
