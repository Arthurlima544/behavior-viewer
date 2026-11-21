import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

type Variant = 'primary' | 'outline' | 'ghost';

interface BaseProps {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'outline',
  icon,
  children,
  className,
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${styles.btn} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** Botão que funciona como link para rotas (ex.: "Apresentar"). */
export function ButtonLink({
  to,
  variant = 'primary',
  icon,
  children,
  className,
}: BaseProps & { to: string }) {
  return (
    <Link to={to} className={`${styles.btn} ${styles.link} ${styles[variant]} ${className ?? ''}`}>
      {icon}
      {children}
    </Link>
  );
}
