import { defineConfig, devices } from '@playwright/test';

const PORT = 8790;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    // Banco limpo a cada execução: os testes começam sem projetos registrados.
    command: 'node -e "require(\'fs\').rmSync(\'data/e2e\',{recursive:true,force:true})" && node apps/server/dist/main.js',
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: false,
    env: {
      // Raízes navegáveis: o repositório, para os testes escolherem as fixtures pela interface.
      BEHAVIOR_BROWSE_ROOTS: process.cwd(),
      BEHAVIOR_BROWSE_LABEL: '~',
      BEHAVIOR_DATA_DIR: 'data/e2e',
      BEHAVIOR_PORT: String(PORT),
      BEHAVIOR_LOG_LEVEL: 'warn',
      // Detecção de mudanças rápida nos testes; a sincronização continua manual.
      BEHAVIOR_SCAN_INTERVAL: '2',
    },
    timeout: 20_000,
  },
});
