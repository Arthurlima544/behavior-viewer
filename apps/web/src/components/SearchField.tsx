import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchField.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  shortcut?: string;
  onFocus?: () => void;
  width?: number;
}

export const SearchField = forwardRef<HTMLInputElement, Props>(function SearchField(
  { value, onChange, placeholder, label, shortcut, onFocus, width },
  ref,
) {
  return (
    <label className={styles.field} style={width ? { minWidth: width } : undefined}>
      <Search size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={styles.input}
      />
      {shortcut ? <kbd className={`mono ${styles.kbd}`}>{shortcut}</kbd> : null}
    </label>
  );
});
