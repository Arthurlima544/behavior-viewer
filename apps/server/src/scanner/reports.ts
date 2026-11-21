import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { expandPattern } from '../util/glob.js';
import {
  parseCucumberJson,
  parseJUnitXml,
  ResultIndex,
  type ReportEntry,
} from '../parser/reports.js';

/** Caminhos padrão procurados dentro da pasta de cada stack (RF-17). */
export const DEFAULT_REPORT_PATTERNS = [
  'target/cucumber.json',
  'reports/cucumber.json',
  'build/cucumber.json',
  'build/test-results/**/*.xml',
  'target/surefire-reports/*.xml',
];

export interface LoadedReports {
  index: ResultIndex;
  files: string[];
  /** Maior mtime entre os relatórios, em ISO. Usado para histórico e "última execução". */
  ultimaExecucao: string | null;
  /** Assinatura dos arquivos (caminho + mtime + tamanho): muda quando há nova execução. */
  fingerprint: string;
  errors: string[];
}

/** Lê os relatórios de uma stack. Arquivos inválidos geram erro, sem derrubar a varredura. */
export async function loadReports(stackDir: string, patterns: string[]): Promise<LoadedReports> {
  const effective = patterns.length > 0 ? patterns : DEFAULT_REPORT_PATTERNS;
  const files = new Set<string>();
  for (const pattern of effective) {
    for (const f of await expandPattern(stackDir, pattern)) files.add(f);
  }

  const entries: ReportEntry[] = [];
  const errors: string[] = [];
  const signature: string[] = [];
  let latest = 0;

  for (const file of [...files].sort()) {
    try {
      const stat = await fs.stat(file);
      latest = Math.max(latest, stat.mtimeMs);
      signature.push(`${file}:${stat.mtimeMs}:${stat.size}`);
      const text = await fs.readFile(file, 'utf8');
      const ext = extname(file).toLowerCase();
      entries.push(...(ext === '.xml' ? parseJUnitXml(text) : parseCucumberJson(text)));
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    index: new ResultIndex(entries),
    files: [...files].sort(),
    ultimaExecucao: latest > 0 ? new Date(latest).toISOString() : null,
    fingerprint: signature.join('|'),
    errors,
  };
}
