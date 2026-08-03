import { defineConfig, devices } from '@playwright/test';

const remoteBaseURL = process.env['PLAYWRIGHT_BASE_URL'];
const baseURL = remoteBaseURL || 'http://127.0.0.1:4201';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile-chrome', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: remoteBaseURL ? undefined : {
    command: 'npm start -- --host 127.0.0.1 --port 4201',
    url: 'http://127.0.0.1:4201/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
