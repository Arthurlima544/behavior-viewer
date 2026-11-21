import { promises as fsp, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { loadConfig, type AppConfig } from './config.js';
import { buildApp } from './api/app.js';
import { Store, storeFilePath } from './store.js';
import { AppState } from './state.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Raízes de navegação em caminho real, para que a validação de caminhos seja consistente. */
async function canonicalRoots(config: AppConfig): Promise<AppConfig> {
  const browseRoots = await Promise.all(
    config.browseRoots.map((r) => fsp.realpath(r).catch(() => r)),
  );
  return { ...config, browseRoots };
}

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main(): Promise<void> {
  const config = await canonicalRoots(loadConfig());
  const store = new Store(storeFilePath(config.dataDir));
  const webDir = process.env.BEHAVIOR_WEB_DIR ?? join(here, '..', '..', 'web', 'dist');

  const logger = pino({ level: config.logLevel });
  const state = new AppState(config, store, logger);
  const app = await buildApp({
    config,
    logger,
    store,
    state,
    version: readVersion(),
    webDir,
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'encerrando');
    state.stopSchedule();
    await app.close();
    store.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  logger.info(
    { browseRoots: config.browseRoots, dataDir: config.dataDir },
    'Behavior Viewer iniciado'
  );

  state.refresh().catch((err: unknown) => logger.error({ err }, 'falha na primeira varredura'));
  state.startSchedule();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
