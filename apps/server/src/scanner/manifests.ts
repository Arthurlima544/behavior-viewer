import { join } from 'node:path';
import type { Stack } from '@behavior-viewer/domain';
import { readText } from '../util/fs.js';

/** Arquivos que indicam a presença de uma stack (RF-04). */
export const MANIFEST_FILES = [
  'pubspec.yaml',
  'package.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
] as const;

/**
 * Detecta a stack de um diretório a partir dos manifestos que ele contém.
 * Retorna null quando nenhum manifesto reconhecido existe.
 */
export async function detectStackInDir(dir: string): Promise<Stack | null> {
  const pubspec = await readText(join(dir, 'pubspec.yaml'));
  if (pubspec !== null && /flutter/i.test(pubspec)) return 'flutter';

  const pkg = await readText(join(dir, 'package.json'));
  if (pkg !== null) {
    try {
      const json = JSON.parse(pkg) as Record<string, Record<string, string> | undefined>;
      const deps = { ...json.dependencies, ...json.devDependencies };
      if ('@cucumber/cucumber' in deps || '@playwright/test' in deps || 'cucumber' in deps) {
        return 'typescript';
      }
    } catch {
      // package.json inválido: ignorado para detecção.
    }
  }

  for (const file of ['pom.xml', 'build.gradle', 'build.gradle.kts']) {
    const content = await readText(join(dir, file));
    if (content !== null && content.includes('io.cucumber')) return 'java';
  }
  return null;
}

/** Indica se um diretório tem algum manifesto (usado para achar a raiz de um projeto). */
export async function hasManifest(dir: string): Promise<boolean> {
  for (const file of MANIFEST_FILES) {
    if ((await readText(join(dir, file))) !== null) return true;
  }
  return false;
}
