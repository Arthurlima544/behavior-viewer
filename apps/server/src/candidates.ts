import { basename } from 'node:path';
import { promises as fs } from 'node:fs';
import { type Stack } from '@behavior-viewer/domain';
import { parseFeatureSource } from './parser/feature.js';
import {
  discoverFeatures,
  resolveProjectRoot,
  resolveStack,
  type ProjectResolution,
} from './scanner/discover.js';
import type { ProjectConfig } from './scanner/projectConfig.js';
import { projectId } from './snapshot.js';
import { displayPath } from './paths.js';

export interface Candidato {
  id: string;
  /** Caminho real da raiz do projeto. */
  caminho: string;
  caminhoExibicao: string;
  nome: string;
  origem: 'auto' | 'config';
  stacks: Stack[];
  /** Arquivos .feature do projeto. */
  arquivos: number;
  funcionalidades: number;
  cenarios: number;
  /** Erros de leitura encontrados ao analisar (não impedem o registro). */
  errosLeitura: number;
  jaRegistrado: boolean;
}

export interface ResultadoDescoberta {
  candidatos: Candidato[];
  /** true quando a varredura atingiu um limite e pode ter ficado incompleta. */
  parcial: boolean;
  /** Número de arquivos .feature encontrados na pasta, antes do agrupamento. */
  featuresEncontrados: number;
}

interface Opcoes {
  roots: string[];
  label: string;
  registrados: Set<string>;
}

/**
 * Identifica projetos dentro de uma pasta escolhida pelo usuário (RF-01, RF-03):
 * agrupa os `.feature` por raiz de projeto e conta funcionalidades, cenários e stacks de cada um.
 */
export async function descobrirProjetos(pasta: string, opcoes: Opcoes): Promise<ResultadoDescoberta> {
  const discovery = await discoverFeatures(pasta, { maxEntries: 500_000, deadlineMs: 60_000 });
  const cache = new Map<string, { config: ProjectConfig | null; error?: string }>();

  const grupos = new Map<string, { resolucao: ProjectResolution; features: { absPath: string }[] }>();
  for (const feature of discovery.features) {
    const resolucao = await resolveProjectRoot(feature, pasta, discovery.markerDirs, cache);
    const grupo = grupos.get(resolucao.projectRoot) ?? { resolucao, features: [] };
    grupo.features.push(feature);
    grupos.set(resolucao.projectRoot, grupo);
  }

  const candidatos: Candidato[] = [];
  for (const [root, grupo] of grupos) {
    const { config } = grupo.resolucao;
    const stacks = new Set<Stack>();
    const funcs = new Set<string>();
    let cenarios = 0;
    let errosLeitura = 0;
    for (const feature of grupo.features) {
      const { stack } = await resolveStack(feature.absPath, root, config);
      stacks.add(stack);
      let source = '';
      try {
        source = await fs.readFile(feature.absPath, 'utf8');
      } catch {
        errosLeitura++;
        continue;
      }
      const out = parseFeatureSource(source, feature.absPath);
      if (!out.ok) {
        errosLeitura += out.erros.length;
        continue;
      }
      if (!out.funcionalidade) continue;
      funcs.add(out.funcionalidade.nome);
      for (const r of out.funcionalidade.regras) cenarios += r.cenarios.length;
    }
    const id = projectId(root);
    candidatos.push({
      id,
      caminho: root,
      caminhoExibicao: displayPath(root, opcoes.roots, opcoes.label),
      nome: config?.nome ?? basename(root),
      origem: config ? 'config' : 'auto',
      stacks: [...stacks],
      arquivos: grupo.features.length,
      funcionalidades: funcs.size,
      cenarios,
      errosLeitura,
      jaRegistrado: opcoes.registrados.has(id),
    });
  }

  candidatos.sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'));
  return { candidatos, parcial: discovery.parcial, featuresEncontrados: discovery.features.length };
}
