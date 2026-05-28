import { defineConfig } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '5180';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx vite --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
