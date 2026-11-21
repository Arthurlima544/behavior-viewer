import type { Stack } from '../api/types';

interface Props {
  stack: Stack;
  size?: number;
}

/** Ícones de stack fixos do design (docs/design §2.4): celular, janela e servidor. */
export function StackIcon({ stack, size = 16 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    'aria-hidden': true,
    focusable: false,
  } as const;
  switch (stack) {
    case 'flutter':
      return (
        <svg {...common}>
          <rect x="5" y="2" width="10" height="16" rx="2" />
          <path d="M9 15h2" />
        </svg>
      );
    case 'typescript':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="16" height="12" rx="2" />
          <path d="M2 8h16" />
        </svg>
      );
    case 'java':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="14" height="6" rx="1.5" />
          <rect x="3" y="11" width="14" height="6" rx="1.5" />
          <path d="M6 6h1M6 14h1" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 2h6l4 4v12H6z" />
          <path d="M12 2v4h4M8 11h6M8 14h6" />
        </svg>
      );
  }
}
