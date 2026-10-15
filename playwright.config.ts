import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
// The production build's `base` (vite.config.ts): the test loads what deploys.
const BASE_URL = `http://127.0.0.1:${PORT}/Depths-of-Souls/`

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
