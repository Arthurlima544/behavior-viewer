import { join } from 'node:path';
import { parse } from 'yaml';
import { STACKS, type Stack } from '@behavior-viewer/domain';
import { readText } from '../util/fs.js';

export const CONFIG_FILE = '.behavior.yml';

export interface DeclaredStack {
  id: Stack;
  /** Caminho relativo à raiz do projeto, sem barra final. "" significa a própria raiz. */
  caminho: string;
  relatorios: string[];
}

/** Componente de uma tela, declarado no .behavior.yml (opcionalmente com o arquivo de origem). */
export interface ComponenteConfig {
  nome: string;
  arquivo?: string;
}

/** Tela declarada no .behavior.yml: nome usado nas tags @tela-, rota e componentes (docs/prompts). */
export interface TelaConfig {
  nome: string;
  rota?: string;
  arquivo?: string;
  componentes: ComponenteConfig[];
}

export interface ProjectConfig {
  nome?: string;
  descricao?: string;
  stacks: DeclaredStack[];
  ignorar: string[];
  telas: TelaConfig[];
}

export interface ConfigReadResult {
  config: ProjectConfig | null;
  error?: string;
}

/** Lê e valida `.behavior.yml` (RF-05). Erro de sintaxe vira mensagem, nunca exceção. */
export async function readProjectConfig(projectRoot: string): Promise<ConfigReadResult> {
  const raw = await readText(join(projectRoot, CONFIG_FILE));
  if (raw === null) return { config: null };
  return parseProjectConfigText(raw);
}

/** Interpreta o texto de um .behavior.yml. Erros viram mensagem, nunca exceção. */
export function parseProjectConfigText(raw: string): ConfigReadResult {

  let doc: unknown;
  try {
    doc = parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
    return { config: null, error: `${CONFIG_FILE}: YAML inválido — ${message}` };
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return { config: null, error: `${CONFIG_FILE}: o conteúdo deve ser um mapa` };
  }

  const record = doc as Record<string, unknown>;
  const stacksRaw = Array.isArray(record.stacks) ? record.stacks : [];
  const stacks: DeclaredStack[] = [];
  for (const item of stacksRaw) {
    if (item === null || typeof item !== 'object') {
      return { config: null, error: `${CONFIG_FILE}: cada item de "stacks" deve ser um mapa` };
    }
    const s = item as Record<string, unknown>;
    const id = String(s.id ?? '');
    if (!(STACKS as readonly string[]).includes(id)) {
      return {
        config: null,
        error: `${CONFIG_FILE}: stack desconhecida "${id}" (use ${STACKS.join(', ')})`,
      };
    }
    stacks.push({
      id: id as Stack,
      caminho: String(s.caminho ?? '')
        .replace(/\/+$/, '')
        .replace(/^\.\//, ''),
      relatorios: Array.isArray(s.relatorios) ? s.relatorios.map(String) : [],
    });
  }

  const telasRead = lerTelas(record.telas);
  if (telasRead.error) return { config: null, error: `${CONFIG_FILE}: ${telasRead.error}` };

  return {
    config: {
      nome: typeof record.nome === 'string' ? record.nome : undefined,
      descricao: typeof record.descricao === 'string' ? record.descricao : undefined,
      stacks,
      ignorar: Array.isArray(record.ignorar) ? record.ignorar.map(String) : [],
      telas: telasRead.telas,
    },
  };
}

/** Valida a seção `telas`. Nome é obrigatório; rota, quando existe, começa com "/". */
function lerTelas(raw: unknown): { telas: TelaConfig[]; error?: string } {
  if (raw === undefined || raw === null) return { telas: [] };
  if (!Array.isArray(raw)) return { telas: [], error: '"telas" deve ser uma lista' };
  const telas: TelaConfig[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') {
      return { telas: [], error: 'cada item de "telas" deve ser um mapa' };
    }
    const t = item as Record<string, unknown>;
    const nome = typeof t.nome === 'string' ? t.nome.trim() : '';
    if (!nome) return { telas: [], error: 'toda tela precisa de "nome"' };
    if (t.rota !== undefined && (typeof t.rota !== 'string' || !t.rota.startsWith('/'))) {
      return { telas: [], error: `a rota da tela "${nome}" deve começar com "/"` };
    }
    const componentes: ComponenteConfig[] = [];
    for (const c of Array.isArray(t.componentes) ? t.componentes : []) {
      const cr = (c ?? {}) as Record<string, unknown>;
      const cn = typeof cr.nome === 'string' ? cr.nome.trim() : '';
      if (!cn) return { telas: [], error: `componente sem "nome" na tela "${nome}"` };
      componentes.push({ nome: cn, arquivo: typeof cr.arquivo === 'string' ? cr.arquivo : undefined });
    }
    telas.push({
      nome,
      rota: typeof t.rota === 'string' ? t.rota : undefined,
      arquivo: typeof t.arquivo === 'string' ? t.arquivo : undefined,
      componentes,
    });
  }
  return { telas };
}
