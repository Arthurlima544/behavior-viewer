import type { RuleStatus, ScenarioResult, Stack } from '../api/types';

export const STACK_LABEL: Record<Stack, string> = {
  flutter: 'Flutter',
  typescript: 'TypeScript',
  java: 'Java',
  'gherkin-generico': 'Gherkin',
};

/** Texto dos chips de status (docs/design §3.1 e §4). */
export const STATUS_LABEL: Record<RuleStatus, string> = {
  passando: 'Passando',
  falhando: 'Falhando',
  pendente: 'Pendente',
  'sem-execucao': 'Sem execução',
  'sem-cobertura': 'Sem cobertura',
};

export const RESULT_LABEL: Record<ScenarioResult, string> = {
  passou: 'Passou',
  falhou: 'Falhou',
  pendente: 'Pendente',
  'sem-execucao': 'Sem execução',
};

export const STATUS_OPTIONS: { value: RuleStatus; label: string }[] = [
  { value: 'passando', label: 'Passando' },
  { value: 'falhando', label: 'Falhando' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'sem-execucao', label: 'Sem execução' },
];

/** Tempo relativo em pt-BR: "agora", "há 12 min", "há 2 h", "há 3 dias". */
export function tempoRelativo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'sem registro';
  const diffMs = now - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return 'sem registro';
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Atalho de busca conforme o sistema operacional (RF-47). */
export function atalhoBusca(): { tecla: string; aria: string } {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  return isMac ? { tecla: '⌘K', aria: 'Command K' } : { tecla: 'Ctrl K', aria: 'Control K' };
}

/** Texto "Presente em" a partir das stacks de uma regra. */
export function rotuloStatus(status: RuleStatus, stack?: string): string {
  if (status === 'falhando' && stack) return `Falhando em ${stack}`;
  return STATUS_LABEL[status];
}

export const TIPO_LABEL: Record<'cenario' | 'esquema', string> = {
  cenario: 'Cenário',
  esquema: 'Esquema do Cenário',
};

/** Palavras-chave de Gherkin em destaque no modo Gherkin (RF-35). */
export function ehPalavraChave(palavra: string): boolean {
  return /^(Dado|Quando|Então|E|Mas|Given|When|Then|And|But)$/.test(palavra);
}
