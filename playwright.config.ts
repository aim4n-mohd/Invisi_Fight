import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

export default defineConfig({
  testDir: './client/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: `${pnpmCommand} --filter @invisi-fight/server dev`,
          env: { ...process.env, MATCH_RECONNECT_GRACE_MS: '1000' },
          url: 'http://127.0.0.1:2567/healthz',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `${pnpmCommand} --filter @invisi-fight/client dev --host 127.0.0.1`,
          env: { ...process.env, VITE_ENABLE_AUDIO: 'false' },
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
