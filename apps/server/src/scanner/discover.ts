import { promises as fs } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import type { Stack } from '@behavior-viewer/domain';
import { CONFIG_FILE, readProjectConfig, type ProjectConfig } from './projectConfig.js';
import { detectStackInDir, hasManifest } from './manifests.js';
import { globToRegExp } from '../util/glob.js';

/** Diretórios que nunca são percorridos (RF-01). */
export const IGNORED_DIRS = new Set([
  'node_modules',
  'build',
  'target',
  '.git',
  '.dart_tool',
  '.gradle',
  'dist',
  'coverage',
  '.idea',
  '.vscode',
  'Pods',
]);

export interface FeatureFileRef {
  /** Caminho absoluto do `.feature`. */
  absPath: string;
  /** Caminho relativo à raiz do workspace que o contém. */
  workspaceRelPath: string;
}

export interface Discovery {
  features: FeatureFileRef[];
  /** Diretórios que são raiz de projeto por marcador explícito (.git ou .behavior.yml). */
  markerDirs: Set<string>;
}

/** Percorre uma pasta raiz coletando arquivos `.feature` e diretórios-marcadores. */
export async function discoverFeatures(workspaceRoot: string): Promise<Discovery> {
  const features: FeatureFileRef[] = [];
  const markerDirs = new Set<string>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.name === '.git') {
        markerDirs.add(dir);
        continue;
      }
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.feature')) {
          features.push({
            absPath: full,
            workspaceRelPath: relative(workspaceRoot, full).split(sep).join('/'),
          });
        } else if (entry.name === CONFIG_FILE) {
          markerDirs.add(dir);
        }
      }
    }
  }

  await walk(workspaceRoot);
  return { features, markerDirs };
}

export interface ResolvedFeature {
  feature: FeatureFileRef;
  projectRoot: string;
  stack: Stack;
  /** Diretório da stack (relativo à raiz do projeto), "" quando é a própria raiz. */
  stackDirRel: string;
  /** Caminho do arquivo relativo à raiz do projeto. */
  fileRelToProject: string;
}

/** Sobe da pasta do arquivo até a raiz do workspace, sem ultrapassá-la. */
function ancestorsWithin(fileDir: string, workspaceRoot: string): string[] {
  const chain: string[] = [];
  let current = fileDir;
  while (true) {
    chain.push(current);
    if (current === workspaceRoot) break;
    const parent = dirname(current);
    if (parent === current || !current.startsWith(workspaceRoot)) break;
    current = parent;
  }
  return chain;
}

export interface ProjectResolution {
  projectRoot: string;
  config: ProjectConfig | null;
  configError?: string;
}

/**
 * Encontra a raiz do projeto de um arquivo (RF-03):
 * 1. diretório mais próximo com `.behavior.yml` ou `.git`;
 * 2. senão, diretório mais próximo com manifesto de stack;
 * 3. senão, a pasta filha direta da raiz do workspace.
 */
export async function resolveProjectRoot(
  feature: FeatureFileRef,
  workspaceRoot: string,
  markerDirs: Set<string>,
  configCache: Map<string, { config: ProjectConfig | null; error?: string }>
): Promise<ProjectResolution> {
  const chain = ancestorsWithin(dirname(feature.absPath), workspaceRoot);

  let projectRoot: string | undefined = chain.find((d) => markerDirs.has(d));
  if (!projectRoot) {
    for (const dir of chain) {
      if (await hasManifest(dir)) {
        projectRoot = dir;
        break;
      }
    }
  }
  if (!projectRoot) {
    const rel = relative(workspaceRoot, feature.absPath).split(sep);
    projectRoot = rel.length > 1 ? join(workspaceRoot, rel[0] as string) : workspaceRoot;
  }

  let cached = configCache.get(projectRoot);
  if (!cached) {
    const read = await readProjectConfig(projectRoot);
    cached = { config: read.config, error: read.error };
    configCache.set(projectRoot, cached);
  }
  return { projectRoot, config: cached.config, configError: cached.error };
}

/** Escolhe a stack de um arquivo: stack declarada no config (caminho mais específico) ou manifesto. */
export async function resolveStack(
  fileAbs: string,
  projectRoot: string,
  config: ProjectConfig | null
): Promise<{ stack: Stack; stackDirRel: string }> {
  const fileRel = relative(projectRoot, fileAbs).split(sep).join('/');

  if (config) {
    let best: { id: Stack; caminho: string } | null = null;
    for (const s of config.stacks) {
      const prefix = s.caminho;
      const matches = prefix === '' || fileRel === prefix || fileRel.startsWith(`${prefix}/`);
      if (matches && (!best || prefix.length > best.caminho.length)) {
        best = { id: s.id, caminho: prefix };
      }
    }
    if (best) return { stack: best.id, stackDirRel: best.caminho };
  }

  // Sem stack declarada: sobe a partir do arquivo procurando manifesto.
  let current = dirname(fileAbs);
  while (current.startsWith(projectRoot)) {
    const detected = await detectStackInDir(current);
    if (detected) {
      return { stack: detected, stackDirRel: relative(projectRoot, current).split(sep).join('/') };
    }
    if (current === projectRoot) break;
    current = dirname(current);
  }
  return { stack: 'gherkin-generico', stackDirRel: '' };
}

/** Indica se um arquivo está coberto por algum padrão `ignorar` do projeto. */
export function isIgnored(fileRelToProject: string, patterns: string[]): boolean {
  return patterns.some((p) => globToRegExp(p.replace(/^\.\//, '')).test(fileRelToProject));
}
