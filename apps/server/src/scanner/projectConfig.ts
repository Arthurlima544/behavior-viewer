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

export interface ProjectConfig {
  nome?: string;
  stacks: DeclaredStack[];
  ignorar: string[];
}

export interface ConfigReadResult {
  config: ProjectConfig | null;
  error?: string;
}

/** Lê e valida `.behavior.yml` (RF-05). Erro de sintaxe vira mensagem, nunca exceção. */
export async function readProjectConfig(projectRoot: string): Promise<ConfigReadResult> {
  const raw = await readText(join(projectRoot, CONFIG_FILE));
  if (raw === null) return { config: null };

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

  return {
    config: {
      nome: typeof record.nome === 'string' ? record.nome : undefined,
      stacks,
      ignorar: Array.isArray(record.ignorar) ? record.ignorar.map(String) : [],
    },
  };
}
