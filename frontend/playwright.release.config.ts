import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/release',
  workers: 1,
  timeout: 30_000,
  globalTimeout: 600_000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: devices['Desktop Chrome'] },
    { name: 'small-mobile', use: devices['Pixel 5'] },
    { name: 'iphone', use: devices['iPhone 12'] },
    { name: 'tablet', use: devices['Galaxy Tab S4'] },
  ],
  webServer: { command: 'node scripts/serve-release.mjs', url: 'http://127.0.0.1:4173', timeout: 30_000 },
});
