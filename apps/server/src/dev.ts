import { existsSync } from 'node:fs';

/**
 * Entrada de desenvolvimento: carrega `.env.development` (se existir) antes de iniciar o servidor.
 * Funciona igual em macOS, Windows e Linux, sem variáveis de shell específicas.
 */
if (existsSync('.env.development')) {
  process.loadEnvFile('.env.development');
}

await import('./main.js');
