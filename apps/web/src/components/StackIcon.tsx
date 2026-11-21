import type { Stack } from '../api/types';

interface Props {
  stack: Stack;
  size?: number;
}

/** Logo oficial das linguagens (assets em public/stacks, CC0 via Simple Icons). Gherkin genérico usa desenho próprio. */
const LOGO: Partial<Record<Stack, string>> = {
  flutter: '/stacks/flutter.svg',
  typescript: '/stacks/typescript.svg',
  java: '/stacks/java.svg',
};

export function StackIcon({ stack, size = 16 }: Props) {
  const logo = LOGO[stack];
  if (logo) {
    return <img src={logo} width={size} height={size} alt="" aria-hidden="true" style={{ display: 'block', flex: 'none' }} />;
  }
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
  return (
    <svg {...common}>
      <path d="M6 2h6l4 4v12H6z" />
      <path d="M12 2v4h4M8 11h6M8 14h6" />
    </svg>
  );
}
