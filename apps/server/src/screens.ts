import { promises as fs } from 'node:fs';
import { isAbsolute, normalize } from 'node:path';
import { normalizeTitle } from '@behavior-viewer/domain';
import type { TelaConfig } from './scanner/projectConfig.js';
import type { CapturaModel, ComponenteRef, TelaRef } from './model.js';

/** Índice de capturas gerado pelo projeto (docs/prompts): caminho relativo à raiz do projeto. */
export const CAPTURAS_INDEX = 'reports/capturas/indice.json';

const EXTENSOES_IMAGEM = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export interface EntradaIndice {
  funcionalidade: string;
  cenario: string;
  passo: string;
  arquivo: string;
  tela: string | null;
}

export interface LeituraIndice {
  entradas: EntradaIndice[];
  erros: string[];
}

/** Caminho relativo seguro: não absoluto, sem ".." e com extensão de imagem. */
export function caminhoCapturaValido(arquivo: string): boolean {
  if (isAbsolute(arquivo) || arquivo.includes('\\')) return false;
  const n = normalize(arquivo).split('/');
  if (n.some((p) => p === '..' || p === '')) return false;
  return EXTENSOES_IMAGEM.some((ext) => arquivo.toLowerCase().endsWith(ext));
}

/** Lê e valida `reports/capturas/indice.json`. Entradas inválidas viram aviso, sem derrubar o projeto. */
export async function lerIndiceCapturas(raiz: string): Promise<LeituraIndice> {
  let texto: string;
  try {
    texto = await fs.readFile(`${raiz}/${CAPTURAS_INDEX}`, 'utf8');
  } catch {
    return { entradas: [], erros: [] };
  }
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch (err) {
    return { entradas: [], erros: [`${CAPTURAS_INDEX}: JSON inválido — ${(err as Error).message}`] };
  }
  const lista = (dados as { capturas?: unknown })?.capturas;
  if (!Array.isArray(lista)) return { entradas: [], erros: [`${CAPTURAS_INDEX}: campo "capturas" ausente`] };

  const entradas: EntradaIndice[] = [];
  const erros: string[] = [];
  for (const [i, item] of lista.entries()) {
    const e = (item ?? {}) as Record<string, unknown>;
    const campos = ['funcionalidade', 'cenario', 'passo', 'arquivo'] as const;
    const faltando = campos.filter((c) => typeof e[c] !== 'string' || !(e[c] as string).trim());
    if (faltando.length > 0) {
      erros.push(`${CAPTURAS_INDEX} item ${i + 1}: campos ausentes (${faltando.join(', ')})`);
      continue;
    }
    const arquivo = e.arquivo as string;
    if (!caminhoCapturaValido(arquivo)) {
      erros.push(`${CAPTURAS_INDEX} item ${i + 1}: caminho inválido ou extensão não suportada (${arquivo})`);
      continue;
    }
    entradas.push({
      funcionalidade: e.funcionalidade as string,
      cenario: e.cenario as string,
      passo: e.passo as string,
      arquivo,
      tela: typeof e.tela === 'string' && e.tela.trim() ? e.tela.trim() : null,
    });
  }
  return { entradas, erros };
}

/** Capturas de um cenário, pela funcionalidade e pelo nome do cenário. */
export function capturasDoCenario(entradas: EntradaIndice[], funcionalidade: string, cenario: string): CapturaModel[] {
  const f = normalizeTitle(funcionalidade);
  const c = normalizeTitle(cenario);
  return entradas
    .filter((e) => normalizeTitle(e.funcionalidade) === f && normalizeTitle(e.cenario) === c)
    .map((e) => ({ passo: e.passo, arquivo: e.arquivo, tela: e.tela }));
}

/** Componente com o arquivo de origem, quando a tela declarou o componente no .behavior.yml. */
export function componentesResolvidos(nomes: string[], telas: TelaConfig[]): ComponenteRef[] {
  const arquivos = new Map<string, string>();
  for (const t of telas) {
    for (const c of t.componentes) {
      if (c.arquivo && !arquivos.has(c.nome)) arquivos.set(c.nome, c.arquivo);
    }
  }
  return [...new Set(nomes)].map((nome) => ({ nome, arquivo: arquivos.get(nome) ?? null }));
}

/**
 * Telas de uma regra (RF de mapa de telas). Uma tela entra por:
 * - tag `@tela:` nos arquivos da regra (origem "tag"), ou
 * - rota declarada no .behavior.yml citada entre aspas em um passo (origem "rota").
 */
export function resolverTelas(
  nomesPorTag: string[],
  textosDosPassos: string[],
  telas: TelaConfig[],
): TelaRef[] {
  const resultado = new Map<string, TelaRef>();
  const declarada = (nome: string) => telas.find((t) => t.nome === nome);

  const montar = (nome: string, origem: TelaRef['origem']): TelaRef => {
    const cfg = declarada(nome);
    return {
      nome,
      rota: cfg?.rota ?? null,
      arquivo: cfg?.arquivo ?? null,
      origem,
      declarada: Boolean(cfg),
      componentes: componentesResolvidos(
        (cfg?.componentes ?? []).map((c) => c.nome),
        telas,
      ),
    };
  };

  for (const nome of nomesPorTag) {
    if (!resultado.has(nome)) resultado.set(nome, montar(nome, 'tag'));
  }
  const texto = textosDosPassos.join('\n');
  for (const t of telas) {
    if (!t.rota || resultado.has(t.nome)) continue;
    if (texto.includes(`"${t.rota}"`) || texto.includes(`'${t.rota}'`)) {
      resultado.set(t.nome, montar(t.nome, 'rota'));
    }
  }
  return [...resultado.values()];
}
