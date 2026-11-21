import styles from './KpiCard.module.css';

interface Props {
  label: string;
  value: string;
  sub: string;
}

/** Indicador do topo da visão geral (RF-23). */
export function KpiCard({ label, value, sub }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.sub}>{sub}</span>
    </div>
  );
}
