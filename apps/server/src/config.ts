import { homedir } from 'node:os';
import { resolve } from 'node:path';

/** Configuração global lida de variáveis de ambiente (RF-51). */
export interface AppConfig {
  /**
   * Pastas que o usuário pode navegar e registrar como projeto (BEHAVIOR_BROWSE_ROOTS).
   * Padrão: a pasta pessoal. No contêiner, aponta para a pasta pessoal montada em modo somente leitura.
   */
  browseRoots: string[];
  /** Rótulo que substitui a raiz nos caminhos exibidos (BEHAVIOR_BROWSE_LABEL). Padrão: "~". */
  browseLabel: string;
  host: string;
  port: number;
  /** Intervalo de varredura em segundos (RF-50). 0 desativa a varredura periódica. */
  scanIntervalSeconds: number;
  dataDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

function intFromEnv(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${name} deve ser um inteiro não negativo (recebido: "${value}")`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rootsRaw = env.BEHAVIOR_BROWSE_ROOTS?.trim() || homedir();
  const browseRoots = rootsRaw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => resolve(p));

  const logLevel = (env.BEHAVIOR_LOG_LEVEL ?? 'info') as AppConfig['logLevel'];
  if (!LOG_LEVELS.includes(logLevel)) {
    throw new Error(`BEHAVIOR_LOG_LEVEL inválido: "${logLevel}"`);
  }

  return {
    browseRoots,
    browseLabel: env.BEHAVIOR_BROWSE_LABEL?.trim() || '~',
    host: env.BEHAVIOR_HOST ?? '127.0.0.1',
    port: intFromEnv(env.BEHAVIOR_PORT, 8787, 'BEHAVIOR_PORT'),
    scanIntervalSeconds: intFromEnv(env.BEHAVIOR_SCAN_INTERVAL, 60, 'BEHAVIOR_SCAN_INTERVAL'),
    dataDir: resolve(env.BEHAVIOR_DATA_DIR ?? './data'),
    logLevel,
  };
}
