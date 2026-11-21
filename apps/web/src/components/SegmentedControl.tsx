import styles from './SegmentedControl.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  ariaLabel: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Controle segmentado acessível com aria-pressed (RF-35). */
export function SegmentedControl<T extends string>({ ariaLabel, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={styles.group}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`${styles.option} ${o.value === value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
