import { defineConfig, devices } from '@playwright/test';

const basePath = '/it-engineer-knowledge-architecture';
const port = process.env.PORT || 4177;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `npm run build:site && ruby -run -e httpd .site -p ${port}`,
    url: `http://127.0.0.1:${port}${basePath}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'chromium-tablet', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'], browserName: 'chromium' } }
  ]
});
