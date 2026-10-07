import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/readiness',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: './reports/readiness/browser/artifacts',
  reporter: [
    ['list'],
    ['json', { outputFile: './reports/readiness/browser/results.json' }],
    ['html', { outputFolder: './reports/readiness/browser/html', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4182',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.READINESS_BROWSER_EXECUTABLE },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
