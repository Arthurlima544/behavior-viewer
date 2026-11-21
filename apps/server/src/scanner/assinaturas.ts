import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { sha256 } from '../atualizacoes.js';
import { readText } from '../util/fs.js';
import { discoverFeatures, isIgnored } from './discover.js';
import { CONFIG_FILE, readProjectConfig } from './projectConfig.js';

/**
 * Hash SHA-256 de cada arquivo da pasta de testes de um projeto (.feature e .behavior.yml), usando
 * as mesmas regras de descoberta e de `ignorar` da varredura completa. Serve para detectar mudanças
 * sem reconstruir o projeto.
 */
export async function hashesDaPasta(root: string): Promise<Record<string, string>> {
  const arquivos: Record<string, string> = {};
  const configRaw = await readText(join(root, CONFIG_FILE));
  if (configRaw !== null) arquivos[CONFIG_FILE] = sha256(configRaw);

  const config = (await readProjectConfig(root)).config;
  const discovery = await discoverFeatures(root, { maxEntries: 500_000, deadlineMs: 60_000 });
  for (const feature of discovery.features) {
    const rel = relative(root, feature.absPath).split(sep).join('/');
    if (config && isIgnored(rel, config.ignorar)) continue;
    try {
      arquivos[rel] = sha256(await fs.readFile(feature.absPath, 'utf8'));
    } catch {
      // arquivo removido durante a leitura: será visto na próxima detecção
    }
  }
  return arquivos;
}
