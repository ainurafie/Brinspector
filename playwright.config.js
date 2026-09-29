// E2E strategy: serve the built panel page and stub `chrome.devtools` in the browser,
// so tests can feed fake HAR entries without opening real DevTools. Backend runs in mock mode.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      cwd: './extension',
      url: 'http://localhost:4173/panel.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'node src/server.js',
      cwd: './backend',
      url: 'http://localhost:3000/health',
      env: { AI_PROVIDER: 'mock', PORT: '3000' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
