import { defineConfig, devices } from '@playwright/test';

const PORT = 8790;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: 'node apps/server/dist/main.js',
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: false,
    env: {
      BEHAVIOR_WORKSPACE: 'fixtures',
      BEHAVIOR_DATA_DIR: 'data/e2e',
      BEHAVIOR_PORT: String(PORT),
      BEHAVIOR_LOG_LEVEL: 'warn',
    },
    timeout: 20_000,
  },
});
